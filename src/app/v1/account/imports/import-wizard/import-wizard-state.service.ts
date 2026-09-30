import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SpreadsheetImportCommandService } from '@data/import/spreadsheet-import-command.service';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { ImportFileDraft } from '@data/import/spreadsheet-import.models';
import {
  buildSpreadsheetImportCommitRequest,
  hasSpreadsheetImportRecords
} from '@data/import/spreadsheet-import-request.builder';
import { isImportPredictorValid } from '@data/import/predictor-import-review';
import { ImportSessionService } from '../import-session.service';
import { stepsForDraft } from '../import-workflow.config';
import { buildImportReviewSummary } from './import-review-summary';
import { ImportWizardDraftStore } from './import-wizard-draft.store';
import { ImportMeterReviewStateService } from './import-meter-review-state.service';
import { ImportPredictorReviewStateService } from './import-predictor-review-state.service';

export type ImportMappingType = 'meter' | 'predictor';

@Injectable()
export class ImportWizardStateService {
  private readonly drafts = inject(SpreadsheetImportDraftService);
  private readonly commands = inject(SpreadsheetImportCommandService);
  private readonly router = inject(Router);
  readonly session = inject(ImportSessionService);
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly draftStore = inject(ImportWizardDraftStore);
  readonly meters = inject(ImportMeterReviewStateService);
  readonly predictors = inject(ImportPredictorReviewStateService);

  readonly draft = this.draftStore.draft;
  readonly currentStepId = signal('');
  readonly error = signal<string | undefined>(undefined);
  readonly committed = signal(false);
  readonly newFacilityName = signal('');

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
  readonly reviewSummary = computed(() => {
    const draft = this.draft();
    if (!draft) return undefined;
    return buildImportReviewSummary({
      kind: draft.kind,
      selectedFacilityId: draft.selectedFacilityId,
      facilities: draft.importFacilities,
      meterRows: this.meters.rows(),
      meterReadingRows: this.meters.readingRows(),
      predictorRows: this.predictors.rows(),
      predictorReadingRows: this.predictors.readingRows(),
      energyUseGroups: draft.facilityEnergyUseGroups,
      equipment: draft.facilityEnergyUseEquipment
    });
  });

  initialize(draft: ImportFileDraft): void {
    this.draftStore.initialize(draft);
    this.meters.initialize();
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
    this.session.updateDraft(draft.id, current => current.status = 'importing');
    try {
      const summary = await this.commands.commit(this.commitRequest(draft));
      this.session.complete(draft.id, summary);
      this.committed.set(true);
      return this.session.nextReady(draft.id);
    } catch (error) {
      this.session.updateDraft(draft.id, current => current.status = 'ready');
      this.error.set(error instanceof Error ? error.message : String(error));
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

  hasUnsavedChanges(): boolean {
    return !this.committed() && this.session.hasUnsavedChanges();
  }

  isNavigationBlocked(): boolean { return this.session.pending(); }

  viewImportedData(): void {
    const draft = this.draft();
    const accountGuid = this.workspace.account()?.guid;
    const returnUrl = allowedWorkspaceReturnUrl(
      this.session.origin().returnUrl,
      accountGuid,
      this.workspace.facilities().map(facility => facility.guid)
    );
    if (returnUrl) {
      void this.router.navigateByUrl(returnUrl);
      return;
    }
    const affected = this.session.summary(draft.id)?.affectedFacilityGuids ?? [];
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
    if (!draft) return 'The upload session is no longer available.';
    if (step === 'review' && !hasSpreadsheetImportRecords(this.commitRequest(draft))) {
      return 'Include at least one record before uploading this file.';
    }
    if (step === 'worksheet' && !draft.selectedWorksheetData.length) return 'Choose a non-empty worksheet.';
    if (step === 'columns') {
      if (this.groupItems('Date').length !== 1) return 'Identify exactly one usable date column.';
      if (!this.meterColumns().length && !this.predictorColumns().length) return 'Identify at least one meter or predictor column.';
    }
    if (step === 'map-meters' && this.unmappedCount('meter')) return 'Assign every meter column to a facility or return it to worksheet columns.';
    if (step === 'map-predictors' && this.unmappedCount('predictor')) return 'Assign every predictor column to a facility or return it to worksheet columns.';
    if (step === 'facility' && !draft.selectedFacilityId) return 'Select a facility for this footprint upload.';
    if (step === 'meters' && draft.meters.some((meter, index) => !meter.skipImport && this.meters.invalid(index))) {
      return 'Fix or skip every invalid meter before continuing.';
    }
    if (step === 'predictors' && draft.predictors.some(predictor => !predictor.skipImport && !isImportPredictorValid(predictor))) {
      return 'Fix or skip every invalid predictor before continuing.';
    }
    if ((step === 'meter-readings' || step === 'review') && this.meters.invalidReadingCount()) {
      const excludedInvalid = this.meters.readingRows().reduce((total, row) =>
        total + row.invalidReadingDetails.filter(reading => reading.excluded).length, 0);
      if (excludedInvalid !== this.meters.invalidReadingCount() || !draft.invalidMeterReadingsAcknowledged) {
        return 'Exclude every invalid meter reading and acknowledge the exclusion before continuing.';
      }
    }
    if ((step === 'predictor-readings' || step === 'review') && this.predictors.invalidReadingCount()) {
      const excludedInvalid = this.predictors.readingRows().reduce((total, row) =>
        total + row.invalidReadingDetails.filter(reading => reading.excluded).length, 0);
      if (excludedInvalid !== this.predictors.invalidReadingCount() || !draft.invalidPredictorReadingsAcknowledged) {
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
    this.draftStore.changed();
  }

  private commitRequest(draft: ImportFileDraft) {
    return buildSpreadsheetImportCommitRequest(draft, this.workspace.account().guid);
  }

}

function allowedWorkspaceReturnUrl(
  returnUrl: string | undefined,
  accountGuid: string | undefined,
  facilityGuids: readonly string[]
): string | undefined {
  if (!returnUrl?.startsWith('/') || returnUrl.startsWith('//')) return undefined;
  try {
    const segments = returnUrl.split(/[?#]/, 1)[0]
      .split('/')
      .filter(Boolean)
      .map(segment => decodeURIComponent(segment));
    if (segments[0] !== 'v1' || segments[1] !== 'workspace') return undefined;
    if (segments[2] === 'account' && segments[3] === accountGuid) return returnUrl;
    if (segments[2] === 'facility' && facilityGuids.includes(segments[3])) return returnUrl;
    return undefined;
  } catch {
    return undefined;
  }
}
