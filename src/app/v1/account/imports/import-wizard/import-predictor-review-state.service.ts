import { computed, inject, Injectable } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import {
  getImportPredictorIssues,
  isImportPredictorValid,
  isSelectableExistingImportPredictor
} from '@data/import/predictor-import-review';
import {
  buildImportPredictorReadingReview,
  ImportPredictorReadingSummaryRow,
  predictorReadingEntityKey
} from '@data/import/predictor-reading-import-review';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { ImportWizardDraftStore } from './import-wizard-draft.store';

export interface ImportPredictorRow {
  readonly index: number;
  readonly predictor: IdbPredictor;
  readonly facilityName: string;
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly typeLabel: string;
  readonly typeDetail?: string;
}

export type ImportPredictorReadingRow = ImportPredictorReadingSummaryRow;

@Injectable()
export class ImportPredictorReviewStateService {
  private readonly drafts = inject(SpreadsheetImportDraftService);
  private readonly draftStore = inject(ImportWizardDraftStore);
  readonly workspace = inject(AccountWorkspaceStore);
  readonly draft = this.draftStore.draft;

  readonly rows = computed<ImportPredictorRow[]>(() => {
    const draft = this.draftStore.draft();
    if (!draft) return [];
    return draft.predictors.map((predictor, index) => ({
      index,
      predictor,
      facilityName: draft.importFacilities.find(facility => facility.guid === predictor.facilityId)?.name ?? 'Unknown facility',
      valid: isImportPredictorValid(predictor),
      issues: getImportPredictorIssues(predictor),
      typeLabel: predictor.predictorType === 'Weather' ? 'Weather' : 'Standard',
      typeDetail: predictor.predictorType === 'Weather'
        ? [predictor.weatherStationName || predictor.weatherStationId, weatherMetricLabel(predictor)]
          .filter(Boolean).join(' · ')
        : undefined
    }));
  });
  readonly allIncluded = computed(() => this.rows().length > 0
    && this.rows().every(row => !row.predictor.skipImport));
  readonly someIncluded = computed(() => this.rows().some(row => !row.predictor.skipImport));
  readonly readingRows = computed<ImportPredictorReadingRow[]>(() => {
    const draft = this.draftStore.draft();
    if (!draft) return [];
    return buildImportPredictorReadingReview({
      predictors: draft.predictors,
      readings: draft.predictorData,
      facilities: draft.importFacilities,
      currentReadings: this.workspace.predictorData(),
      excludedReadingIds: draft.excludedPredictorReadingIds,
      skipExistingPredictorIds: draft.skipExistingPredictorIds
    });
  });
  readonly importedReadingCount = computed(() => this.readingRows().reduce((total, row) =>
    total + row.newReadings.count + row.invalidReadings.count + row.existingReadings.count, 0));
  readonly invalidReadingCount = computed(() => this.readingRows().reduce((total, row) =>
    total + row.invalidReadings.count, 0));
  readonly readingsToImportCount = computed(() => this.readingRows().reduce((total, row) =>
    total + row.newReadings.count
      + (row.keepExisting ? 0 : row.existingReadings.count)
      + row.invalidReadingDetails.filter(reading => !reading.excluded).length, 0));
  readonly hasExistingReadings = computed(() => this.readingRows().some(row => row.existingReadings.count > 0));
  readonly allExistingReadingsKept = computed(() => {
    const eligible = this.readingRows().filter(row => row.existingReadings.count > 0);
    return eligible.length > 0 && eligible.every(row => row.keepExisting);
  });
  readonly someExistingReadingsKept = computed(() => this.readingRows()
    .some(row => row.existingReadings.count > 0 && row.keepExisting));

  toggleIncluded(index: number, included: boolean): void {
    const predictor = this.draft().predictors[index];
    predictor.skipImport = !included;
    if (!included) this.clearReadingDecisions(predictor.guid);
    this.invalidateReviewSteps();
    this.changed();
  }

  setAllIncluded(included: boolean): void {
    this.draft().predictors.forEach(predictor => predictor.skipImport = !included);
    if (!included) {
      this.draft().skipExistingPredictorIds = [];
      this.draft().excludedPredictorReadingIds = [];
      this.draft().invalidPredictorReadingsAcknowledged = false;
    }
    this.invalidateReviewSteps();
    this.changed();
  }

  setProduction(index: number, production: boolean): void {
    const predictor = this.draft().predictors[index];
    predictor.production = production;
    predictor.productionInAnalysis = production;
    this.invalidateReview();
    this.changed();
  }

  availableExisting(index: number): IdbPredictor[] {
    const predictor = this.draft().predictors[index];
    const used = new Set(this.draft().predictors
      .filter((_, candidateIndex) => candidateIndex !== index)
      .map(candidate => candidate.guid));
    return this.workspace.predictors()
      .filter(candidate => candidate.facilityId === predictor.facilityId
        && !used.has(candidate.guid)
        && isSelectableExistingImportPredictor(candidate))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(candidate => structuredClone(candidate));
  }

  save(originalGuid: string, predictor: IdbPredictor): void {
    if (!this.draft().predictors.some(candidate => candidate.guid === originalGuid)) return;
    this.drafts.replacePredictor(this.draft(), originalGuid, predictor);
    this.invalidateReviewSteps();
    this.changed();
  }

  setSkipExistingReadings(predictorId: string, skip: boolean): void {
    const eligibleIds = new Set(this.readingRows()
      .filter(row => row.existingReadings.count > 0)
      .map(row => row.predictor.guid));
    if (skip && !eligibleIds.has(predictorId)) return;
    const selected = new Set(this.draft().skipExistingPredictorIds.filter(id => eligibleIds.has(id)));
    if (skip) selected.add(predictorId);
    else selected.delete(predictorId);
    this.draft().skipExistingPredictorIds = [...selected];
    this.invalidateReview();
    this.changed();
  }

  setAllSkipExistingReadings(skip: boolean): void {
    const eligibleIds = this.readingRows()
      .filter(row => row.existingReadings.count > 0)
      .map(row => row.predictor.guid);
    this.draft().skipExistingPredictorIds = skip ? [...new Set(eligibleIds)] : [];
    this.invalidateReview();
    this.changed();
  }

  toggleExcludedReading(index: number, excluded: boolean): void {
    const reading = this.draft().predictorData[index];
    if (!reading) return;
    const key = predictorReadingEntityKey(reading, index);
    const exclusions = this.draft().excludedPredictorReadingIds;
    if (excluded && !exclusions.map(String).includes(String(key))) exclusions.push(key);
    if (!excluded) {
      this.draft().excludedPredictorReadingIds = exclusions.filter(value => String(value) !== String(key));
    }
    this.invalidateReview();
    if (!this.invalidReadingGateSatisfied()) this.invalidateReadings();
    this.changed();
  }

  setInvalidReadingsAcknowledged(acknowledged: boolean): void {
    this.draft().invalidPredictorReadingsAcknowledged = acknowledged;
    this.invalidateReview();
    if (!this.invalidReadingGateSatisfied()) this.invalidateReadings();
    this.changed();
  }

  private changed(): void {
    this.draftStore.changed();
  }

  private clearReadingDecisions(predictorId: string): void {
    this.draft().skipExistingPredictorIds = this.draft().skipExistingPredictorIds
      .filter(id => id !== predictorId);
    const readingKeys = new Set(this.draft().predictorData
      .map((reading, index) => ({ reading, index }))
      .filter(entry => entry.reading.predictorId === predictorId)
      .flatMap(entry => [
        predictorReadingEntityKey(entry.reading, entry.index),
        predictorReadingEntityKey(entry.reading)
      ]));
    this.draft().excludedPredictorReadingIds = this.draft().excludedPredictorReadingIds
      .filter(key => !readingKeys.has(String(key)));
    if (!this.draft().excludedPredictorReadingIds.length) {
      this.draft().invalidPredictorReadingsAcknowledged = false;
    }
  }

  private invalidateReview(): void {
    this.draft().completedSteps = this.draft().completedSteps.filter(step => step !== 'review');
  }

  private invalidateReadings(): void {
    this.draft().completedSteps = this.draft().completedSteps.filter(step => step !== 'predictor-readings');
  }

  private invalidateReviewSteps(): void {
    this.draft().completedSteps = this.draft().completedSteps
      .filter(step => step !== 'predictor-readings' && step !== 'review');
  }

  private invalidReadingGateSatisfied(): boolean {
    const draft = this.draft();
    const invalidReadings = buildImportPredictorReadingReview({
      predictors: draft.predictors,
      readings: draft.predictorData,
      facilities: draft.importFacilities,
      currentReadings: this.workspace.predictorData(),
      excludedReadingIds: draft.excludedPredictorReadingIds,
      skipExistingPredictorIds: draft.skipExistingPredictorIds
    }).flatMap(row => row.invalidReadingDetails);
    return invalidReadings.length === 0
      || (invalidReadings.every(reading => reading.excluded) && draft.invalidPredictorReadingsAcknowledged);
  }
}

function weatherMetricLabel(predictor: IdbPredictor): string {
  const labels: Record<IdbPredictor['weatherDataType'], string> = {
    HDD: 'Heating degree days',
    CDD: 'Cooling degree days',
    relativeHumidity: 'Relative humidity',
    dryBulbTemp: 'Dry bulb temperature',
    wetBulbTemp: 'Wet bulb temperature',
    dewPointTemp: 'Dew point temperature',
    precipitation: 'Precipitation'
  };
  return labels[predictor.weatherDataType];
}
