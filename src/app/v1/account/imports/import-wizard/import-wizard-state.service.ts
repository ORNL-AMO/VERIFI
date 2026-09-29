import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SpreadsheetImportCommandService } from '@data/import/spreadsheet-import-command.service';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { ImportCommitRequest, ImportFileDraft } from '@data/import/spreadsheet-import.models';
import {
  buildImportMeterReadingReview,
  getImportMeterReadingIssues,
  ImportMeterReadingSummaryRow,
  isImportMeterReadingValid,
  meterReadingEntityKey
} from '@data/import/meter-reading-import-review';
import { isMeterInvalid } from '@domain/calculations/status-check-calculations/validation/meterValidation';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { canAssignMeterSourceToGroup } from '@domain/meters/meter-group-compatibility';
import { MeterSettingsFormService } from '@app/v1/shared/meter-settings/meter-settings-form.service';
import { IdbPredictor } from '@data/models/idbModels/predictor';
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
import { ImportSessionService } from '../import-session.service';
import { stepsForDraft } from '../import-workflow.config';
import { buildImportReviewSummary } from './steps/review/import-review-summary';

export type ImportMappingType = 'meter' | 'predictor';

export interface ImportMeterRow {
  readonly index: number;
  readonly meter: IdbUtilityMeter;
  readonly facilityName: string;
  readonly valid: boolean;
  readonly unitLabel: string;
  readonly groups: readonly IdbUtilityMeterGroup[];
}

export interface ImportMeterReadingRow extends ImportMeterReadingSummaryRow {
  readonly primaryUnitLabel: string;
}

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
export class ImportWizardStateService {
  private readonly drafts = inject(SpreadsheetImportDraftService);
  private readonly commands = inject(SpreadsheetImportCommandService);
  private readonly router = inject(Router);
  readonly session = inject(ImportSessionService);
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly meterSettings = inject(MeterSettingsFormService);

  readonly draft = signal<ImportFileDraft | undefined>(undefined);
  readonly currentStepId = signal('');
  readonly error = signal<string | undefined>(undefined);
  readonly committed = signal(false);
  readonly newFacilityName = signal('');
  private readonly draftRevision = signal(0);
  private readonly nextCalendarizationMethod = signal<'backward' | 'fullYear' | 'fullMonth'>('backward');
  private readonly defaultMeterGroups = new Map<string, IdbUtilityMeterGroup>();

  readonly steps = computed(() => this.draft() ? stepsForDraft(this.draft()) : []);
  readonly currentStep = computed(() => this.steps().find(step => step.id === this.currentStepId()));
  readonly currentStepNumber = computed(() => {
    const index = this.steps().findIndex(step => step.id === this.currentStepId());
    return index >= 0 ? index + 1 : 0;
  });
  readonly meterColumns = computed(() => this.groupItems('Meters'));
  readonly predictorColumns = computed(() => this.groupItems('Predictors'));
  readonly allColumns = computed(() => this.draft()?.columnGroups
    .flatMap(group => group.groupItems)
    .sort((left, right) => left.index - right.index) ?? []);
  readonly worksheetNames = computed(() => this.draft()
    ? this.drafts.visibleWorksheetNames(this.draft().workbook)
    : []);
  readonly dateRange = computed(() => {
    const dateColumn = this.groupItems('Date')[0]?.value;
    const dates = dateColumn
      ? this.draft()?.headerMap.map(row => new Date(row[dateColumn] as any)).filter(date => !isNaN(date.valueOf())) ?? []
      : [];
    if (!dates.length) return 'No usable dates found';
    const times = dates.map(date => date.getTime());
    return `${new Date(Math.min(...times)).toLocaleDateString()} – ${new Date(Math.max(...times)).toLocaleDateString()}`;
  });
  readonly meterRows = computed<ImportMeterRow[]>(() => {
    this.draftRevision();
    const draft = this.draft();
    if (!draft) return [];
    return draft.meters.map((meter, index) => ({
      index,
      meter,
      facilityName: draft.importFacilities.find(facility => facility.guid === meter.facilityId)?.name ?? 'Unknown facility',
      valid: !this.meterInvalid(index),
      unitLabel: this.meterSettings.getUnitLabel(meter.scope === 2 ? meter.vehicleCollectionUnit : meter.startingUnit),
      groups: this.compatibleGroupsForMeter(meter)
    }));
  });
  readonly meterReadingRows = computed<ImportMeterReadingRow[]>(() => {
    this.draftRevision();
    const draft = this.draft();
    if (!draft) return [];
    return buildImportMeterReadingReview({
      meters: draft.meters,
      readings: draft.meterData,
      facilities: draft.importFacilities,
      currentReadings: this.workspace.meterData(),
      excludedReadingIds: draft.excludedMeterReadingIds,
      skipExistingMeterIds: draft.skipExistingReadingsMeterIds
    }).map(row => ({
      ...row,
      primaryUnitLabel: this.meterSettings.getUnitLabel(row.primaryUnit)
    }));
  });
  readonly importedMeterReadingCount = computed(() => this.meterReadingRows().reduce((total, row) =>
    total + row.newReadings.count + row.invalidReadings.count + row.existingReadings.count, 0));
  readonly invalidReadingCount = computed(() => this.meterReadingRows().reduce((total, row) =>
    total + row.invalidReadings.count, 0));
  readonly hasExistingMeterReadings = computed(() => this.meterReadingRows()
    .some(row => row.existingReadings.count > 0));
  readonly allExistingMeterReadingsKept = computed(() => {
    const eligible = this.meterReadingRows().filter(row => row.existingReadings.count > 0);
    return eligible.length > 0 && eligible.every(row => row.keepExisting);
  });
  readonly someExistingMeterReadingsKept = computed(() => this.meterReadingRows()
    .some(row => row.existingReadings.count > 0 && row.keepExisting));
  readonly predictorRows = computed<ImportPredictorRow[]>(() => {
    this.draftRevision();
    const draft = this.draft();
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
  readonly allPredictorsIncluded = computed(() => this.predictorRows().length > 0
    && this.predictorRows().every(row => !row.predictor.skipImport));
  readonly somePredictorsIncluded = computed(() => this.predictorRows()
    .some(row => !row.predictor.skipImport));
  readonly predictorReadingRows = computed<ImportPredictorReadingRow[]>(() => {
    this.draftRevision();
    const draft = this.draft();
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
  readonly importedPredictorReadingCount = computed(() => this.predictorReadingRows().reduce((total, row) =>
    total + row.newReadings.count + row.invalidReadings.count + row.existingReadings.count, 0));
  readonly invalidPredictorReadingCount = computed(() => this.predictorReadingRows().reduce((total, row) =>
    total + row.invalidReadings.count, 0));
  readonly predictorReadingsToImportCount = computed(() => this.predictorReadingRows().reduce((total, row) =>
    total + row.newReadings.count
      + (row.keepExisting ? 0 : row.existingReadings.count)
      + row.invalidReadingDetails.filter(reading => !reading.excluded).length, 0));
  readonly hasExistingPredictorReadings = computed(() => this.predictorReadingRows()
    .some(row => row.existingReadings.count > 0));
  readonly allExistingPredictorReadingsKept = computed(() => {
    const eligible = this.predictorReadingRows().filter(row => row.existingReadings.count > 0);
    return eligible.length > 0 && eligible.every(row => row.keepExisting);
  });
  readonly someExistingPredictorReadingsKept = computed(() => this.predictorReadingRows()
    .some(row => row.existingReadings.count > 0 && row.keepExisting));
  readonly reviewSummary = computed(() => {
    this.draftRevision();
    const draft = this.draft();
    if (!draft) return undefined;
    return buildImportReviewSummary({
      kind: draft.kind,
      selectedFacilityId: draft.selectedFacilityId,
      facilities: draft.importFacilities,
      meterRows: this.meterRows(),
      meterReadingRows: this.meterReadingRows(),
      predictorRows: this.predictorRows(),
      predictorReadingRows: this.predictorReadingRows(),
      energyUseGroups: draft.facilityEnergyUseGroups,
      equipment: draft.facilityEnergyUseEquipment
    });
  });

  initialize(draft: ImportFileDraft): void {
    this.draft.set(draft);
    this.committed.set(draft.status === 'completed');
    this.defaultMeterGroups.clear();
    this.nextCalendarizationMethod.set('backward');
    this.draftRevision.update(value => value + 1);
  }

  allowedStep(requestedStep: string | undefined): string {
    const steps = this.steps();
    const draft = this.draft();
    const requestedIndex = steps.findIndex(step => step.id === requestedStep);
    const firstIncompleteIndex = steps.findIndex(step => !draft.completedSteps.includes(step.id));
    const maxIndex = firstIncompleteIndex < 0 ? steps.length - 1 : firstIncompleteIndex;
    return requestedIndex >= 0 && requestedIndex <= maxIndex
      ? requestedStep
      : steps[Math.max(0, maxIndex)]?.id;
  }

  activateStep(stepId: string): void {
    this.currentStepId.set(stepId);
    this.error.set(undefined);
    const draft = this.draft();
    if (draft.kind === 'general-workbook' && ['map-meters', 'map-predictors'].includes(stepId) &&
      draft.meterFacilityGroups.length === 0 && draft.predictorFacilityGroups.length === 0) {
      this.drafts.initializeFacilityMappings(draft);
      this.changed();
    }
  }

  completeCurrentStep(): string | undefined {
    const issue = this.validationMessage();
    if (issue) {
      this.error.set(issue);
      return undefined;
    }
    const draft = this.draft();
    this.error.set(undefined);
    if (!draft.completedSteps.includes(this.currentStepId())) draft.completedSteps.push(this.currentStepId());
    this.changed();
    const index = this.steps().findIndex(step => step.id === this.currentStepId());
    return this.steps()[index + 1]?.id;
  }

  previousStep(): string | undefined {
    const index = this.steps().findIndex(step => step.id === this.currentStepId());
    return index > 0 ? this.steps()[index - 1].id : undefined;
  }

  async commit(): Promise<ImportFileDraft | undefined> {
    const issue = this.validationMessage();
    if (issue) {
      this.error.set(issue);
      return undefined;
    }
    const draft = this.draft();
    this.session.setPending(true);
    draft.status = 'importing';
    this.changed();
    try {
      const summary = await this.commands.commit(this.commitRequest(draft));
      this.session.complete(draft.id, summary);
      this.committed.set(true);
      return this.session.nextReady(draft.id);
    } catch (error) {
      draft.status = 'ready';
      this.error.set(error instanceof Error ? error.message : String(error));
      this.changed();
      return undefined;
    } finally {
      this.session.setPending(false);
    }
  }

  selectWorksheet(name: string): void {
    this.drafts.selectWorksheet(this.draft(), name);
    this.changed();
  }

  assignColumn(itemId: string, target: string): void {
    this.drafts.assignColumn(this.draft(), itemId, target as any);
    this.changed();
  }

  columnTarget(itemId: string): string {
    return this.draft()?.columnGroups.find(group => group.groupItems.some(item => item.id === itemId))?.groupLabel
      ?? 'Worksheet Columns';
  }

  mappingItems(type: ImportMappingType) {
    const groups = type === 'meter' ? this.draft()?.meterFacilityGroups : this.draft()?.predictorFacilityGroups;
    return (groups ?? []).flatMap(group => group.groupItems.map(item => ({
      ...item,
      facilityId: group.facilityName.startsWith('Unmapped') ? '' : group.facilityId
    })));
  }

  mapColumn(type: ImportMappingType, itemId: string, facilityId: string): void {
    this.drafts.mapColumnToFacility(this.draft(), type, itemId, facilityId || undefined);
    this.changed();
  }

  addFacility(): void {
    const name = this.newFacilityName().trim();
    if (!name) return;
    this.drafts.addGeneralFacility(this.draft(), name);
    this.newFacilityName.set('');
    this.changed();
  }

  setFootprintFacility(facilityId: string): void {
    this.drafts.applyFootprintFacility(this.draft(), facilityId);
    this.changed();
  }

  compatibleMeterGroups(equipmentIndex: number) {
    const draft = this.draft();
    const equipment = draft.facilityEnergyUseEquipment[equipmentIndex];
    const equipmentSources = new Set(equipment.utilityData.map(value => value.energySource));
    return this.workspace.meterGroups().filter(group => group.facilityId === draft.selectedFacilityId &&
      this.workspace.meters().some(meter => meter.groupId === group.guid && equipmentSources.has(meter.source)));
  }

  meterGroupSourceConflict(equipmentIndex: number, groupId: string): boolean {
    const equipment = this.draft().facilityEnergyUseEquipment[equipmentIndex];
    if (equipment.utilityMeterGroupIds.includes(groupId)) return false;
    const selectedSources = new Set(this.workspace.meters()
      .filter(meter => equipment.utilityMeterGroupIds.includes(meter.groupId))
      .map(meter => meter.source));
    return this.workspace.meters().some(meter => meter.groupId === groupId && selectedSources.has(meter.source));
  }

  toggleEquipmentMeterGroup(equipmentIndex: number, groupId: string, checked: boolean): void {
    const equipment = this.draft().facilityEnergyUseEquipment[equipmentIndex];
    if (checked && !equipment.utilityMeterGroupIds.includes(groupId)) equipment.utilityMeterGroupIds.push(groupId);
    if (!checked) equipment.utilityMeterGroupIds = equipment.utilityMeterGroupIds.filter(id => id !== groupId);
    this.changed();
  }

  notifyChanged(): void { this.changed(); }

  toggleMeterIncluded(index: number, included: boolean): void {
    this.draft().meters[index].skipImport = !included;
    this.changed();
  }

  meterInvalid(index: number): boolean {
    const meter = this.draft().meters[index];
    return isMeterInvalid(meter) || this.meterSettings.buildMeterSettingsForm(meter).invalid;
  }

  setMeterGroup(index: number, groupId: string | undefined): void {
    const draft = this.draft();
    const meter = draft.meters[index];
    const group = this.compatibleGroupsForMeter(meter).find(option => option.guid === groupId);
    meter.groupId = group?.guid;
    if (group && group.id == null && !draft.newMeterGroups.some(option => option.guid === group.guid)) {
      draft.newMeterGroups.push(group);
    }
    this.syncNewMeterGroups();
    this.invalidateReview();
    this.changed();
  }

  autoGroupMeters(): void {
    this.draft().meters.forEach((meter, index) => {
      if (meter.groupId) return;
      const targetName = meter.source === 'Electricity' && (meter.agreementType === 4 || meter.agreementType === 6)
        ? 'Other (non-energy)'
        : meter.source;
      const groups = this.compatibleGroupsForMeter(meter);
      const expectedType = targetName === 'Other (non-energy)'
        ? 'Other'
        : meter.source === 'Water Intake' || meter.source === 'Water Discharge' ? 'Water' : 'Energy';
      const target = groups.find(group => group.name === targetName && group.groupType === expectedType)
        ?? groups.find(group => group.name === 'Other (non-energy)');
      if (target) {
        meter.groupId = target.guid;
        if (target.id == null && !this.draft().newMeterGroups.some(group => group.guid === target.guid)) {
          this.draft().newMeterGroups.push(target);
        }
      }
    });
    this.syncNewMeterGroups();
    this.invalidateReview();
    this.changed();
  }

  setMeterCalendarization(index: number, method: 'backward' | 'fullYear' | 'fullMonth' | undefined): void {
    this.draft().meters[index].meterReadingDataApplication = method;
    this.invalidateReview();
    this.changed();
  }

  toggleAllMeterCalendarization(): void {
    const method = this.nextCalendarizationMethod();
    this.draft().meters.forEach(meter => meter.meterReadingDataApplication = method);
    this.nextCalendarizationMethod.set(method === 'backward' ? 'fullYear' : method === 'fullYear' ? 'fullMonth' : 'backward');
    this.invalidateReview();
    this.changed();
  }

  availableExistingMeters(index: number): IdbUtilityMeter[] {
    const meter = this.draft().meters[index];
    const used = new Set(this.draft().meters
      .filter((_, candidateIndex) => candidateIndex !== index)
      .map(candidate => candidate.guid));
    return this.workspace.meters()
      .filter(candidate => candidate.facilityId === meter.facilityId && !used.has(candidate.guid))
      .map(candidate => structuredClone(candidate));
  }

  saveMeter(originalGuid: string, meter: IdbUtilityMeter): void {
    const current = this.draft().meters.find(candidate => candidate.guid === originalGuid);
    if (!current) return;
    const selectedGroup = this.allMeterGroups(current.facilityId).find(group => group.guid === meter.groupId);
    if (selectedGroup && !canAssignMeterSourceToGroup(meter.source, selectedGroup)) meter.groupId = undefined;
    this.drafts.replaceMeter(this.draft(), originalGuid, meter);
    this.syncNewMeterGroups();
    this.invalidateMeterReviewSteps();
    this.changed();
  }

  togglePredictorIncluded(index: number, included: boolean): void {
    const predictor = this.draft().predictors[index];
    predictor.skipImport = !included;
    if (!included) this.clearPredictorReadingDecisions(predictor.guid);
    this.invalidatePredictorReviewSteps();
    this.changed();
  }

  setAllPredictorsIncluded(included: boolean): void {
    this.draft().predictors.forEach(predictor => predictor.skipImport = !included);
    if (!included) {
      this.draft().skipExistingPredictorIds = [];
      this.draft().excludedPredictorReadingIds = [];
      this.draft().invalidPredictorReadingsAcknowledged = false;
    }
    this.invalidatePredictorReviewSteps();
    this.changed();
  }

  setPredictorProduction(index: number, production: boolean): void {
    const predictor = this.draft().predictors[index];
    predictor.production = production;
    predictor.productionInAnalysis = production;
    this.invalidateReview();
    this.changed();
  }

  availableExistingPredictors(index: number): IdbPredictor[] {
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

  savePredictor(originalGuid: string, predictor: IdbPredictor): void {
    if (!this.draft().predictors.some(candidate => candidate.guid === originalGuid)) return;
    this.drafts.replacePredictor(this.draft(), originalGuid, predictor);
    this.invalidatePredictorReviewSteps();
    this.changed();
  }

  toggleExcludedReading(index: number, excluded: boolean): void {
    const reading = this.draft().meterData[index];
    const key = reading.id ?? reading.guid;
    const exclusions = this.draft().excludedMeterReadingIds;
    if (excluded && !exclusions.map(String).includes(String(key))) exclusions.push(key);
    if (!excluded) this.draft().excludedMeterReadingIds = exclusions.filter(value => String(value) !== String(key));
    this.invalidateReview();
    if (!this.invalidReadingGateSatisfied()) this.invalidateMeterReadings();
    this.changed();
  }

  isReadingExcluded(index: number): boolean {
    const reading = this.draft().meterData[index];
    return this.draft().excludedMeterReadingIds.map(String).includes(String(reading.id ?? reading.guid));
  }

  readingInvalid(index: number): boolean {
    return !isImportMeterReadingValid(this.draft().meterData[index]);
  }

  readingIssues(index: number): readonly string[] {
    return getImportMeterReadingIssues(this.draft().meterData[index]);
  }

  setSkipExistingMeterReadings(meterId: string, skip: boolean): void {
    const eligibleIds = new Set(this.meterReadingRows()
      .filter(row => row.existingReadings.count > 0)
      .map(row => row.meter.guid));
    if (skip && !eligibleIds.has(meterId)) return;
    const selected = new Set(this.draft().skipExistingReadingsMeterIds.filter(id => eligibleIds.has(id)));
    if (skip) selected.add(meterId);
    else selected.delete(meterId);
    this.draft().skipExistingReadingsMeterIds = [...selected];
    this.invalidateReview();
    this.changed();
  }

  setAllSkipExistingMeterReadings(skip: boolean): void {
    const eligibleIds = this.meterReadingRows()
      .filter(row => row.existingReadings.count > 0)
      .map(row => row.meter.guid);
    this.draft().skipExistingReadingsMeterIds = skip ? [...new Set(eligibleIds)] : [];
    this.invalidateReview();
    this.changed();
  }

  setInvalidMeterReadingsAcknowledged(acknowledged: boolean): void {
    this.draft().invalidMeterReadingsAcknowledged = acknowledged;
    this.invalidateReview();
    if (!this.invalidReadingGateSatisfied()) this.invalidateMeterReadings();
    this.changed();
  }

  setSkipExistingPredictorReadings(predictorId: string, skip: boolean): void {
    const eligibleIds = new Set(this.predictorReadingRows()
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

  setAllSkipExistingPredictorReadings(skip: boolean): void {
    const eligibleIds = this.predictorReadingRows()
      .filter(row => row.existingReadings.count > 0)
      .map(row => row.predictor.guid);
    this.draft().skipExistingPredictorIds = skip ? [...new Set(eligibleIds)] : [];
    this.invalidateReview();
    this.changed();
  }

  toggleExcludedPredictorReading(index: number, excluded: boolean): void {
    const reading = this.draft().predictorData[index];
    if (!reading) return;
    const key = predictorReadingEntityKey(reading, index);
    const exclusions = this.draft().excludedPredictorReadingIds;
    if (excluded && !exclusions.map(String).includes(String(key))) exclusions.push(key);
    if (!excluded) {
      this.draft().excludedPredictorReadingIds = exclusions.filter(value => String(value) !== String(key));
    }
    this.invalidateReview();
    if (!this.invalidPredictorReadingGateSatisfied()) this.invalidatePredictorReadings();
    this.changed();
  }

  setInvalidPredictorReadingsAcknowledged(acknowledged: boolean): void {
    this.draft().invalidPredictorReadingsAcknowledged = acknowledged;
    this.invalidateReview();
    if (!this.invalidPredictorReadingGateSatisfied()) this.invalidatePredictorReadings();
    this.changed();
  }

  hasUnsavedChanges(): boolean {
    return !this.committed() && this.session.hasUnsavedChanges();
  }

  isNavigationBlocked(): boolean { return this.session.pending(); }

  viewImportedData(): void {
    const draft = this.draft();
    const accountGuid = this.workspace.account()?.guid;
    const affected = this.session.summary()?.affectedFacilityGuids ?? [];
    if (draft.kind === 'footprint-tool' && draft.selectedFacilityId) {
      void this.router.navigate(['/v1/workspace/facility', draft.selectedFacilityId, 'data', 'energy-uses']);
    } else if (affected.length === 1) {
      const detail = draft.predictors.length && !draft.meters.length ? 'predictors' : 'meters';
      void this.router.navigate(['/v1/workspace/facility', affected[0], 'data', detail]);
    } else {
      void this.router.navigate(['/v1/workspace/account', accountGuid, 'data', 'portfolio', 'facilities']);
    }
  }

  importAnother(): void {
    const accountGuid = this.workspace.account()?.guid;
    this.session.clear();
    void this.router.navigate(['/v1/workspace/account', accountGuid, 'imports', 'upload']);
  }

  private validationMessage(): string | undefined {
    const draft = this.draft();
    const step = this.currentStepId();
    if (!draft) return 'The import session is no longer available.';
    if (step === 'worksheet' && !draft.selectedWorksheetData.length) return 'Choose a non-empty worksheet.';
    if (step === 'columns') {
      if (this.groupItems('Date').length !== 1) return 'Identify exactly one usable date column.';
      if (!this.meterColumns().length && !this.predictorColumns().length) return 'Identify at least one meter or predictor column.';
    }
    if (step === 'map-meters' && this.unmappedCount('meter')) return 'Assign every meter column to a facility or return it to worksheet columns.';
    if (step === 'map-predictors' && this.unmappedCount('predictor')) return 'Assign every predictor column to a facility or return it to worksheet columns.';
    if (step === 'facility' && !draft.selectedFacilityId) return 'Select a facility for this footprint import.';
    if (step === 'meters' && draft.meters.some((meter, index) => !meter.skipImport && this.meterInvalid(index))) {
      return 'Fix or skip every invalid meter before continuing.';
    }
    if (step === 'predictors' && draft.predictors.some(predictor => !predictor.skipImport && !isImportPredictorValid(predictor))) {
      return 'Fix or skip every invalid predictor before continuing.';
    }
    if ((step === 'meter-readings' || step === 'review') && this.invalidReadingCount()) {
      const excludedInvalid = this.meterReadingRows().reduce((total, row) =>
        total + row.invalidReadingDetails.filter(reading => reading.excluded).length, 0);
      if (excludedInvalid !== this.invalidReadingCount() || !draft.invalidMeterReadingsAcknowledged) {
        return 'Exclude every invalid meter reading and acknowledge the exclusion before continuing.';
      }
    }
    if ((step === 'predictor-readings' || step === 'review') && this.invalidPredictorReadingCount()) {
      const excludedInvalid = this.predictorReadingRows().reduce((total, row) =>
        total + row.invalidReadingDetails.filter(reading => reading.excluded).length, 0);
      if (excludedInvalid !== this.invalidPredictorReadingCount() || !draft.invalidPredictorReadingsAcknowledged) {
        return 'Exclude every invalid predictor reading and acknowledge the exclusion before continuing.';
      }
    }
    return undefined;
  }

  private unmappedCount(type: ImportMappingType): number {
    const groups = type === 'meter' ? this.draft()?.meterFacilityGroups : this.draft()?.predictorFacilityGroups;
    return groups?.find(group => group.facilityName.startsWith('Unmapped'))?.groupItems.length ?? 0;
  }

  private groupItems(label: string) {
    return this.draft()?.columnGroups.find(group => group.groupLabel === label)?.groupItems ?? [];
  }

  private changed(): void {
    this.draftRevision.update(value => value + 1);
    this.session.notifyChanged();
  }

  private commitRequest(draft: ImportFileDraft): ImportCommitRequest {
    const meters = draft.meters.filter(meter => !meter.skipImport);
    const predictors = draft.predictors.filter(predictor => !predictor.skipImport);
    const meterIds = new Set(meters.map(meter => meter.guid));
    const predictorIds = new Set(predictors.map(predictor => predictor.guid));
    const predictorReadingExclusions = new Set(draft.excludedPredictorReadingIds.map(String));
    const predictorReadingEntries = draft.predictorData
      .map((reading, index) => ({ reading, index }))
      .filter(entry => predictorIds.has(entry.reading.predictorId));
    const excludedPredictorReadingIds = predictorReadingEntries.reduce<Array<number | string>>((keys, entry, index) => {
      if (predictorReadingExclusions.has(predictorReadingEntityKey(entry.reading, entry.index))
        || predictorReadingExclusions.has(predictorReadingEntityKey(entry.reading))) {
        keys.push(predictorReadingEntityKey(entry.reading, index));
      }
      return keys;
    }, []);
    const affectedFacilities = new Set([
      ...meters.map(meter => meter.facilityId), ...predictors.map(predictor => predictor.facilityId),
      ...draft.facilityEnergyUseGroups.map(group => group.facilityId)
    ]);
    return {
      accountGuid: this.workspace.account().guid,
      draftId: draft.id,
      kind: draft.kind,
      facilities: draft.kind === 'footprint-tool'
        ? []
        : draft.kind === 'general-workbook'
          ? draft.importFacilities.filter(facility => affectedFacilities.has(facility.guid))
          : draft.importFacilities,
      meterGroups: draft.newMeterGroups.filter(group => affectedFacilities.has(group.facilityId) &&
        meters.some(meter => meter.groupId === group.guid)),
      meters,
      meterReadings: draft.meterData.filter(reading => meterIds.has(reading.meterId)),
      predictors,
      predictorReadings: predictorReadingEntries.map(entry => entry.reading),
      energyUseGroups: draft.facilityEnergyUseGroups,
      energyUseEquipment: draft.facilityEnergyUseEquipment,
      skipExistingReadingsMeterIds: draft.skipExistingReadingsMeterIds,
      skipExistingPredictorIds: draft.skipExistingPredictorIds,
      excludedMeterReadingIds: draft.excludedMeterReadingIds,
      invalidMeterReadingsAcknowledged: draft.invalidMeterReadingsAcknowledged,
      excludedPredictorReadingIds,
      invalidPredictorReadingsAcknowledged: draft.invalidPredictorReadingsAcknowledged
    };
  }

  private compatibleGroupsForMeter(meter: IdbUtilityMeter): IdbUtilityMeterGroup[] {
    return this.allMeterGroups(meter.facilityId)
      .filter(group => canAssignMeterSourceToGroup(meter.source, group))
      .sort((left, right) => left.groupType.localeCompare(right.groupType) || left.name.localeCompare(right.name));
  }

  private allMeterGroups(facilityId: string): IdbUtilityMeterGroup[] {
    const persisted = this.workspace.meterGroups().filter(group => group.facilityId === facilityId);
    const draft = this.draft().newMeterGroups.filter(group => group.facilityId === facilityId);
    const defaults = this.defaultGroupsForFacility(facilityId);
    const byGuid = new Map([...persisted, ...draft, ...defaults].map(group => [group.guid, group]));
    return [...byGuid.values()];
  }

  private defaultGroupsForFacility(facilityId: string): IdbUtilityMeterGroup[] {
    const facility = this.draft().importFacilities.find(candidate => candidate.guid === facilityId);
    if (!facility) return [];
    const definitions: Array<['Energy' | 'Water' | 'Other', string]> = [
      ['Energy', 'Electricity'],
      ['Energy', 'Natural Gas'],
      ['Energy', 'Other Fuels'],
      ['Energy', 'Other Energy'],
      ['Water', 'Water Intake'],
      ['Water', 'Water Discharge'],
      ['Other', 'Other (non-energy)']
    ];
    const existingNames = new Set([
      ...this.workspace.meterGroups().filter(group => group.facilityId === facilityId),
      ...this.draft().newMeterGroups.filter(group => group.facilityId === facilityId)
    ].map(group => group.name));
    return definitions
      .filter(([, name]) => !existingNames.has(name))
      .map(([type, name]) => {
        const key = `${facilityId}:${type}:${name}`;
        if (!this.defaultMeterGroups.has(key)) {
          this.defaultMeterGroups.set(key, getNewIdbUtilityMeterGroup(type, name, facilityId, facility.accountId));
        }
        return this.defaultMeterGroups.get(key)!;
      });
  }

  private syncNewMeterGroups(): void {
    const referenced = new Set(this.draft().meters.map(meter => meter.groupId).filter(Boolean));
    this.draft().newMeterGroups = this.draft().newMeterGroups.filter(group => referenced.has(group.guid));
  }

  private invalidateReview(): void {
    this.draft().completedSteps = this.draft().completedSteps.filter(step => step !== 'review');
  }

  private invalidateMeterReadings(): void {
    this.draft().completedSteps = this.draft().completedSteps.filter(step => step !== 'meter-readings');
  }

  private invalidatePredictorReadings(): void {
    this.draft().completedSteps = this.draft().completedSteps.filter(step => step !== 'predictor-readings');
  }

  private invalidReadingGateSatisfied(): boolean {
    const draft = this.draft();
    const includedMeterIds = new Set(draft.meters.filter(meter => !meter.skipImport).map(meter => meter.guid));
    const invalidReadings = draft.meterData
      .filter(reading => includedMeterIds.has(reading.meterId) && !isImportMeterReadingValid(reading));
    const exclusions = new Set(draft.excludedMeterReadingIds.map(String));
    return invalidReadings.length === 0 ||
      (invalidReadings.every(reading => exclusions.has(meterReadingEntityKey(reading))) && draft.invalidMeterReadingsAcknowledged);
  }

  private invalidPredictorReadingGateSatisfied(): boolean {
    const draft = this.draft();
    const rows = buildImportPredictorReadingReview({
      predictors: draft.predictors,
      readings: draft.predictorData,
      facilities: draft.importFacilities,
      currentReadings: this.workspace.predictorData(),
      excludedReadingIds: draft.excludedPredictorReadingIds,
      skipExistingPredictorIds: draft.skipExistingPredictorIds
    });
    const invalidReadings = rows.flatMap(row => row.invalidReadingDetails);
    return invalidReadings.length === 0 ||
      (invalidReadings.every(reading => reading.excluded) && draft.invalidPredictorReadingsAcknowledged);
  }

  private clearPredictorReadingDecisions(predictorId: string): void {
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

  private invalidateMeterReviewSteps(): void {
    this.draft().completedSteps = this.draft().completedSteps
      .filter(step => step !== 'meter-readings' && step !== 'review');
  }

  private invalidatePredictorReviewSteps(): void {
    this.draft().completedSteps = this.draft().completedSteps
      .filter(step => step !== 'predictor-readings' && step !== 'review');
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
