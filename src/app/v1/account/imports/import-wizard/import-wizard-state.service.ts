import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SpreadsheetImportCommandService } from '@data/import/spreadsheet-import-command.service';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { ImportCommitRequest, ImportFileDraft } from '@data/import/spreadsheet-import.models';
import { isMeterInvalid } from '@domain/calculations/status-check-calculations/validation/meterValidation';
import { ImportSessionService } from '../import-session.service';
import { stepsForDraft } from '../import-workflow.config';

export type ImportMappingType = 'meter' | 'predictor';

@Injectable()
export class ImportWizardStateService {
  private readonly drafts = inject(SpreadsheetImportDraftService);
  private readonly commands = inject(SpreadsheetImportCommandService);
  private readonly router = inject(Router);
  readonly session = inject(ImportSessionService);
  readonly workspace = inject(AccountWorkspaceStore);

  readonly draft = signal<ImportFileDraft | undefined>(undefined);
  readonly currentStepId = signal('');
  readonly error = signal<string | undefined>(undefined);
  readonly committed = signal(false);
  readonly newFacilityName = signal('');

  readonly steps = computed(() => this.draft() ? stepsForDraft(this.draft()) : []);
  readonly currentStep = computed(() => this.steps().find(step => step.id === this.currentStepId()));
  readonly meterColumns = computed(() => this.groupItems('Meters'));
  readonly predictorColumns = computed(() => this.groupItems('Predictors'));
  readonly allColumns = computed(() => this.draft()?.columnGroups
    .flatMap(group => group.groupItems)
    .sort((left, right) => left.index - right.index) ?? []);
  readonly worksheetNames = computed(() => this.draft()
    ? this.drafts.visibleWorksheetNames(this.draft().workbook)
    : []);
  readonly invalidReadingCount = computed(() => this.draft()?.meterData
    .filter((_, index) => this.readingInvalid(index)).length ?? 0);
  readonly dateRange = computed(() => {
    const dateColumn = this.groupItems('Date')[0]?.value;
    const dates = dateColumn
      ? this.draft()?.headerMap.map(row => new Date(row[dateColumn] as any)).filter(date => !isNaN(date.valueOf())) ?? []
      : [];
    if (!dates.length) return 'No usable dates found';
    const times = dates.map(date => date.getTime());
    return `${new Date(Math.min(...times)).toLocaleDateString()} – ${new Date(Math.max(...times)).toLocaleDateString()}`;
  });

  initialize(draft: ImportFileDraft): void {
    this.draft.set(draft);
    this.committed.set(draft.status === 'completed');
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

  canOpenStep(stepId: string): boolean {
    return stepId === this.currentStepId() || this.draft()?.completedSteps.includes(stepId);
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
    if (draft.kind === 'general-workbook') this.drafts.materializeGeneralRecords(draft);
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
    return isMeterInvalid(this.draft().meters[index]);
  }

  togglePredictorIncluded(index: number, included: boolean): void {
    this.draft().predictors[index].skipImport = !included;
    this.changed();
  }

  setPredictorProduction(index: number, production: boolean): void {
    const predictor = this.draft().predictors[index];
    predictor.production = production;
    predictor.productionInAnalysis = production;
    this.changed();
  }

  toggleExcludedReading(index: number, excluded: boolean): void {
    const reading = this.draft().meterData[index];
    const key = reading.id ?? reading.guid;
    const exclusions = this.draft().excludedMeterReadingIds;
    if (excluded && !exclusions.map(String).includes(String(key))) exclusions.push(key);
    if (!excluded) this.draft().excludedMeterReadingIds = exclusions.filter(value => String(value) !== String(key));
    this.changed();
  }

  isReadingExcluded(index: number): boolean {
    const reading = this.draft().meterData[index];
    return this.draft().excludedMeterReadingIds.map(String).includes(String(reading.id ?? reading.guid));
  }

  readingInvalid(index: number): boolean {
    const reading = this.draft().meterData[index];
    return !(Number.isInteger(reading.year) && reading.year > 1900 &&
      Number.isInteger(reading.month) && reading.month >= 1 && reading.month <= 12 &&
      Number.isInteger(reading.day) && reading.day >= 1 && reading.day <= 31 &&
      [reading.totalEnergyUse, reading.totalVolume, reading.totalImportConsumption]
        .filter(value => value !== undefined && value !== null)
        .every(value => Number.isFinite(Number(value))));
  }

  setSkipExistingMeterReadings(meterId: string, skip: boolean): void {
    this.setStringDecision(this.draft().skipExistingReadingsMeterIds, meterId, skip);
  }

  setSkipExistingPredictorReadings(facilityId: string, skip: boolean): void {
    this.setStringDecision(this.draft().skipExistingPredictorFacilityIds, facilityId, skip);
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
    if (step === 'meters' && draft.meters.some(meter => !meter.skipImport && isMeterInvalid(meter))) return 'Fix or skip every invalid meter before continuing.';
    if (step === 'predictors' && draft.predictors.some(predictor => !predictor.skipImport && !predictor.name?.trim())) return 'Fix or skip every invalid predictor before continuing.';
    if ((step === 'meter-readings' || step === 'review') && this.invalidReadingCount()) {
      const excludedInvalid = draft.meterData.filter((_, index) => this.readingInvalid(index) && this.isReadingExcluded(index)).length;
      if (excludedInvalid !== this.invalidReadingCount() || !draft.invalidMeterReadingsAcknowledged) {
        return 'Exclude every invalid meter reading and acknowledge the exclusion before continuing.';
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

  private setStringDecision(values: string[], id: string, selected: boolean): void {
    if (selected && !values.includes(id)) values.push(id);
    if (!selected) values.splice(values.indexOf(id), values.includes(id) ? 1 : 0);
    this.changed();
  }

  private changed(): void { this.session.notifyChanged(); }

  private commitRequest(draft: ImportFileDraft): ImportCommitRequest {
    const meters = draft.meters.filter(meter => !meter.skipImport);
    const predictors = draft.predictors.filter(predictor => !predictor.skipImport);
    const meterIds = new Set(meters.map(meter => meter.guid));
    const predictorIds = new Set(predictors.map(predictor => predictor.guid));
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
      meterGroups: draft.newMeterGroups.filter(group => affectedFacilities.has(group.facilityId)),
      meters,
      meterReadings: draft.meterData.filter(reading => meterIds.has(reading.meterId)),
      predictors,
      predictorReadings: draft.predictorData.filter(reading => predictorIds.has(reading.predictorId)),
      energyUseGroups: draft.facilityEnergyUseGroups,
      energyUseEquipment: draft.facilityEnergyUseEquipment,
      skipExistingReadingsMeterIds: draft.skipExistingReadingsMeterIds,
      skipExistingPredictorFacilityIds: draft.skipExistingPredictorFacilityIds,
      excludedMeterReadingIds: draft.excludedMeterReadingIds,
      invalidMeterReadingsAcknowledged: draft.invalidMeterReadingsAcknowledged
    };
  }
}
