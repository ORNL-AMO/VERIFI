import { computed, inject, Injectable, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { isImportMeterValid } from '@data/import/meter-import-review';
import {
  buildImportMeterReadingReview,
  getImportMeterReadingIssues,
  ImportMeterReadingSummaryRow,
  isImportMeterReadingValid,
  meterReadingEntityKey
} from '@data/import/meter-reading-import-review';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { canAssignMeterSourceToGroup } from '@domain/meters/meter-group-compatibility';
import { MeterSettingsFormService } from '@app/v1/shared/meter-settings/meter-settings-form.service';
import { ImportWizardDraftStore } from './import-wizard-draft.store';

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

@Injectable()
export class ImportMeterReviewStateService {
  private readonly drafts = inject(SpreadsheetImportDraftService);
  private readonly draftStore = inject(ImportWizardDraftStore);
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly meterSettings = inject(MeterSettingsFormService);
  private readonly nextCalendarizationMethod = signal<'backward' | 'fullYear' | 'fullMonth'>('backward');
  private readonly defaultMeterGroups = new Map<string, IdbUtilityMeterGroup>();
  readonly draft = this.draftStore.draft;

  readonly rows = computed<ImportMeterRow[]>(() => {
    const draft = this.draftStore.draft();
    if (!draft) return [];
    return draft.meters.map((meter, index) => ({
      index,
      meter,
      facilityName: draft.importFacilities.find(facility => facility.guid === meter.facilityId)?.name ?? 'Unknown facility',
      valid: !this.invalid(index),
      unitLabel: this.meterSettings.getUnitLabel(meter.scope === 2 ? meter.vehicleCollectionUnit : meter.startingUnit),
      groups: this.compatibleGroupsForMeter(meter)
    }));
  });
  readonly readingRows = computed<ImportMeterReadingRow[]>(() => {
    const draft = this.draftStore.draft();
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
  readonly importedReadingCount = computed(() => this.readingRows().reduce((total, row) =>
    total + row.newReadings.count + row.invalidReadings.count + row.existingReadings.count, 0));
  readonly invalidReadingCount = computed(() => this.readingRows().reduce((total, row) =>
    total + row.invalidReadings.count, 0));
  readonly hasExistingReadings = computed(() => this.readingRows().some(row => row.existingReadings.count > 0));
  readonly allExistingReadingsKept = computed(() => {
    const eligible = this.readingRows().filter(row => row.existingReadings.count > 0);
    return eligible.length > 0 && eligible.every(row => row.keepExisting);
  });
  readonly someExistingReadingsKept = computed(() => this.readingRows()
    .some(row => row.existingReadings.count > 0 && row.keepExisting));

  initialize(): void {
    this.defaultMeterGroups.clear();
    this.nextCalendarizationMethod.set('backward');
  }

  toggleIncluded(index: number, included: boolean): void {
    this.draft().meters[index].skipImport = !included;
    this.changed();
  }

  invalid(index: number): boolean {
    return !isImportMeterValid(this.draft().meters[index]);
  }

  setGroup(index: number, groupId: string | undefined): void {
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

  autoGroup(): void {
    this.draft().meters.forEach(meter => {
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

  setCalendarization(index: number, method: 'backward' | 'fullYear' | 'fullMonth' | undefined): void {
    this.draft().meters[index].meterReadingDataApplication = method;
    this.invalidateReview();
    this.changed();
  }

  toggleAllCalendarization(): void {
    const method = this.nextCalendarizationMethod();
    this.draft().meters.forEach(meter => meter.meterReadingDataApplication = method);
    this.nextCalendarizationMethod.set(method === 'backward' ? 'fullYear' : method === 'fullYear' ? 'fullMonth' : 'backward');
    this.invalidateReview();
    this.changed();
  }

  availableExisting(index: number): IdbUtilityMeter[] {
    const meter = this.draft().meters[index];
    const used = new Set(this.draft().meters
      .filter((_, candidateIndex) => candidateIndex !== index)
      .map(candidate => candidate.guid));
    return this.workspace.meters()
      .filter(candidate => candidate.facilityId === meter.facilityId && !used.has(candidate.guid))
      .map(candidate => structuredClone(candidate));
  }

  save(originalGuid: string, meter: IdbUtilityMeter): void {
    const current = this.draft().meters.find(candidate => candidate.guid === originalGuid);
    if (!current) return;
    const selectedGroup = this.allMeterGroups(current.facilityId).find(group => group.guid === meter.groupId);
    if (selectedGroup && !canAssignMeterSourceToGroup(meter.source, selectedGroup)) meter.groupId = undefined;
    this.drafts.replaceMeter(this.draft(), originalGuid, meter);
    this.syncNewMeterGroups();
    this.invalidateReviewSteps();
    this.changed();
  }

  toggleExcludedReading(index: number, excluded: boolean): void {
    const reading = this.draft().meterData[index];
    const key = meterReadingEntityKey(reading, index);
    const exclusions = this.draft().excludedMeterReadingIds;
    if (excluded && !exclusions.map(String).includes(String(key))) exclusions.push(key);
    if (!excluded) this.draft().excludedMeterReadingIds = exclusions.filter(value => String(value) !== String(key));
    this.invalidateReview();
    if (!this.invalidReadingGateSatisfied()) this.invalidateReadings();
    this.changed();
  }

  isReadingExcluded(index: number): boolean {
    const reading = this.draft().meterData[index];
    const exclusions = new Set(this.draft().excludedMeterReadingIds.map(String));
    return exclusions.has(meterReadingEntityKey(reading, index)) || exclusions.has(meterReadingEntityKey(reading));
  }

  readingInvalid(index: number): boolean {
    return !isImportMeterReadingValid(this.draft().meterData[index]);
  }

  readingIssues(index: number): readonly string[] {
    return getImportMeterReadingIssues(this.draft().meterData[index]);
  }

  setSkipExistingReadings(meterId: string, skip: boolean): void {
    const eligibleIds = new Set(this.readingRows()
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

  setAllSkipExistingReadings(skip: boolean): void {
    const eligibleIds = this.readingRows()
      .filter(row => row.existingReadings.count > 0)
      .map(row => row.meter.guid);
    this.draft().skipExistingReadingsMeterIds = skip ? [...new Set(eligibleIds)] : [];
    this.invalidateReview();
    this.changed();
  }

  setInvalidReadingsAcknowledged(acknowledged: boolean): void {
    this.draft().invalidMeterReadingsAcknowledged = acknowledged;
    this.invalidateReview();
    if (!this.invalidReadingGateSatisfied()) this.invalidateReadings();
    this.changed();
  }

  private changed(): void {
    this.draftStore.changed();
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

  private invalidateReadings(): void {
    this.draft().completedSteps = this.draft().completedSteps.filter(step => step !== 'meter-readings');
  }

  private invalidateReviewSteps(): void {
    this.draft().completedSteps = this.draft().completedSteps
      .filter(step => step !== 'meter-readings' && step !== 'review');
  }

  private invalidReadingGateSatisfied(): boolean {
    const draft = this.draft();
    const invalidReadings = buildImportMeterReadingReview({
      meters: draft.meters,
      readings: draft.meterData,
      facilities: draft.importFacilities,
      currentReadings: this.workspace.meterData(),
      excludedReadingIds: draft.excludedMeterReadingIds,
      skipExistingMeterIds: draft.skipExistingReadingsMeterIds
    }).flatMap(row => row.invalidReadingDetails);
    return invalidReadings.length === 0
      || (invalidReadings.every(reading => reading.excluded) && draft.invalidMeterReadingsAcknowledged);
  }
}
