import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SpreadsheetImportCommandService } from '@data/import/spreadsheet-import-command.service';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { profileGeneralWorkbookColumn } from '@data/import/general-workbook-column-profile';
import { ColumnTarget, ImportFileDraft } from '@data/import/spreadsheet-import.models';
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
import {
  columnTargetLabel,
  ImportColumnCardView,
  ImportColumnLaneView,
  ImportColumnStepStatus,
  IMPORT_COLUMN_TARGETS
} from './import-column.models';
import {
  importMappingDropListId,
  ImportMappingBoardView,
  ImportMappingLaneView,
  ImportMappingType
} from './import-mapping.models';

export { ImportMappingType } from './import-mapping.models';

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
  readonly selectedColumnIds = signal<readonly string[]>([]);
  readonly columnAnnouncement = signal('');
  readonly selectedMappingItemIds = signal<readonly string[]>([]);
  readonly mappingAnnouncement = signal('');

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
  private readonly columnProfiles = computed(() => new Map(this.allColumns().map(column => [
    column.id,
    profileGeneralWorkbookColumn(column, this.draft()?.headerMap ?? [])
  ])));
  readonly columnCards = computed<readonly ImportColumnCardView[]>(() => this.allColumns().map(column => ({
    id: column.id,
    header: column.value,
    index: column.index,
    target: this.columnTarget(column.id),
    likelyDate: this.columnProfiles().get(column.id)?.likelyDate ?? false
  })));
  readonly columnLanes = computed<readonly ImportColumnLaneView[]>(() => {
    return IMPORT_COLUMN_TARGETS.map(target => {
      const cards = this.columnCards().filter(card => card.target === target);
      return {
        target,
        label: columnTargetLabel(target),
        description: columnLaneDescription(target),
        icon: columnLaneIcon(target),
        cards,
        totalCount: cards.length
      };
    });
  });
  readonly selectedColumnCount = computed(() => this.selectedColumnIds().length);
  readonly columnStepStatus = computed<ImportColumnStepStatus>(() => {
    const dateColumn = this.groupItems('Date')[0];
    const profile = dateColumn ? this.columnProfiles().get(dateColumn.id) : undefined;
    const range = profile?.minDate && profile.maxDate
      ? `${profile.minDate.toLocaleDateString()} – ${profile.maxDate.toLocaleDateString()}`
      : 'No usable dates found';
    const date = {
      selected: !!dateColumn,
      usable: !!profile?.usableDateCount,
      usableCount: profile?.usableDateCount ?? 0,
      invalidCount: profile?.invalidDateRows.length ?? 0,
      invalidRows: profile?.invalidDateRows.slice(0, 5) ?? [],
      range
    };
    const hasDataColumn = this.meterColumns().length > 0 || this.predictorColumns().length > 0;
    return { ready: date.selected && date.usable && hasDataColumn, hasDataColumn, date };
  });
  readonly columnContinueMessage = computed(() => {
    const status = this.columnStepStatus();
    if (!status.date.selected) return 'Choose one Date column before continuing.';
    if (!status.date.usable) return 'Choose a Date column with at least one usable date.';
    if (!status.hasDataColumn) return 'Move at least one column to Meters or Predictors.';
    return undefined;
  });
  readonly selectedMappingItemCount = computed(() => this.selectedMappingItemIds().length);
  readonly activeMappingType = computed<ImportMappingType | undefined>(() => {
    if (this.currentStepId() === 'map-meters') return 'meter';
    if (this.currentStepId() === 'map-predictors') return 'predictor';
    return undefined;
  });
  readonly activeMappingBoard = computed(() => {
    const type = this.activeMappingType();
    return type ? this.mappingBoard(type) : undefined;
  });
  readonly stepContinueMessage = computed(() => {
    if (this.currentStepId() === 'columns') return this.columnContinueMessage();
    const board = this.activeMappingBoard();
    if (!board || board.status.ready) return undefined;
    return `Map all ${board.type} columns before continuing.`;
  });
  readonly canContinueCurrentStep = computed(() => {
    if (this.currentStepId() === 'columns') return this.columnStepStatus().ready;
    return this.activeMappingBoard()?.status.ready ?? true;
  });
  readonly worksheetNames = computed(() => this.draft()
    ? this.drafts.visibleWorksheetNames(this.draft().workbook)
    : []);
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
    this.selectedColumnIds.set([]);
    this.columnAnnouncement.set('');
    this.selectedMappingItemIds.set([]);
    this.mappingAnnouncement.set('');
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
    const enteringStep = this.currentStepId() !== stepId;
    if (enteringStep) {
      this.selectedMappingItemIds.set([]);
      this.mappingAnnouncement.set('');
    }
    this.currentStepId.set(stepId);
    this.error.set(undefined);
    const draft = this.draft();
    if (draft.kind === 'general-workbook' && ['map-meters', 'map-predictors'].includes(stepId) &&
      draft.meterFacilityGroups.length === 0 && draft.predictorFacilityGroups.length === 0) {
      this.drafts.initializeFacilityMappings(draft);
      this.changed();
    }
    if (enteringStep && stepId === 'map-meters') {
      this.selectedMappingItemIds.set(this.mappingBoard('meter').unmappedLane.cards.map(card => card.id));
    } else if (enteringStep && stepId === 'map-predictors') {
      this.selectedMappingItemIds.set(this.mappingBoard('predictor').unmappedLane.cards.map(card => card.id));
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
    this.invalidateGeneralColumnDependencies();
    this.selectedColumnIds.set([]);
    this.changed();
  }

  moveColumns(itemIds: readonly string[], target: ColumnTarget): void {
    const currentTargets = new Map(this.columnCards().map(card => [card.id, card.target]));
    const movingIds = [...new Set(itemIds)].filter(id => currentTargets.has(id) && currentTargets.get(id) !== target);
    if (!movingIds.length || (target === 'Date' && movingIds.length !== 1)) return;
    const priorDate = target === 'Date' ? this.groupItems('Date')[0] : undefined;
    this.drafts.assignColumns(this.draft(), movingIds, target);
    this.invalidateGeneralColumnDependencies();
    const movedIds = new Set([...movingIds, ...(priorDate ? [priorDate.id] : [])]);
    this.selectedColumnIds.update(selected => selected.filter(id => !movedIds.has(id)));
    const movedLabel = movingIds.length === 1 ? '1 column' : `${movingIds.length} columns`;
    const swapLabel = priorDate && !movingIds.includes(priorDate.id)
      ? ` ${priorDate.value} was returned to Not imported.`
      : '';
    this.columnAnnouncement.set(`${movedLabel} moved to ${columnTargetLabel(target)}.${swapLabel}`);
    this.changed();
  }

  columnTarget(itemId: string): ColumnTarget {
    const label = this.draft()?.columnGroups
      .find(group => group.groupItems.some(item => item.id === itemId))?.groupLabel as ColumnTarget | undefined;
    return label && IMPORT_COLUMN_TARGETS.includes(label) ? label : 'Worksheet Columns';
  }

  setColumnSelected(itemId: string, selected: boolean): void {
    this.selectedColumnIds.update(ids => selected
      ? [...new Set([...ids, itemId])]
      : ids.filter(id => id !== itemId));
  }

  moveSelectedColumns(target: ColumnTarget): void {
    this.moveColumns(this.selectedColumnIds(), target);
  }

  mappingBoard(type: ImportMappingType): ImportMappingBoardView {
    const draft = this.draft();
    const groups = type === 'meter' ? draft?.meterFacilityGroups : draft?.predictorFacilityGroups;
    const unmappedGroup = groups?.find(group => group.facilityName.startsWith('Unmapped'));
    const unmappedLane = this.mappingLane({
      id: 'unmapped',
      label: 'Unmapped',
      description: `Assign every ${type} column to a facility.`,
      color: 'var(--v1-danger)',
      unmapped: true,
      items: unmappedGroup?.groupItems ?? []
    });
    const facilityLanes = (draft?.importFacilities ?? []).map(facility => {
      const group = groups?.find(candidate => candidate.facilityId === facility.guid);
      return this.mappingLane({
        id: facility.guid,
        facilityId: facility.guid,
        label: facility.name,
        description: `${type === 'meter' ? 'Meter' : 'Predictor'} columns assigned here.`,
        color: facility.color || 'var(--v1-action)',
        unmapped: false,
        items: group?.groupItems ?? []
      });
    });
    const lanes = [unmappedLane, ...facilityLanes];
    const unmappedCount = unmappedLane.totalCount;
    const totalCount = lanes.reduce((total, lane) => total + lane.totalCount, 0);
    return {
      type,
      itemLabel: type === 'meter' ? 'meters' : 'predictors',
      unmappedLane,
      facilityLanes,
      lanes,
      destinations: lanes.map(lane => ({ id: lane.id, facilityId: lane.facilityId, label: lane.label })),
      connectedDropListIds: lanes.map(lane => importMappingDropListId(type, lane.id)),
      status: {
        totalCount,
        mappedCount: totalCount - unmappedCount,
        unmappedCount,
        ready: unmappedCount === 0
      }
    };
  }

  setMappingItemSelected(itemId: string, selected: boolean): void {
    this.selectedMappingItemIds.update(ids => selected
      ? [...new Set([...ids, itemId])]
      : ids.filter(id => id !== itemId));
  }

  moveFacilityMappingItems(type: ImportMappingType, itemIds: readonly string[], facilityId?: string): void {
    const board = this.mappingBoard(type);
    const target = board.lanes.find(lane => lane.facilityId === facilityId);
    if (!target) return;
    const currentLaneById = new Map(board.lanes.flatMap(lane => lane.cards.map(card => [card.id, lane.facilityId] as const)));
    const movingIds = [...new Set(itemIds)].filter(id => currentLaneById.has(id) && currentLaneById.get(id) !== facilityId);
    if (!movingIds.length) return;
    this.drafts.assignFacilityMappingItems(this.draft(), type, movingIds, facilityId);
    const movedIds = new Set(movingIds);
    this.selectedMappingItemIds.update(ids => ids.filter(id => !movedIds.has(id)));
    this.mappingAnnouncement.set(`${movingIds.length} ${type}${movingIds.length === 1 ? '' : 's'} moved to ${target.label}.`);
    this.invalidateFromStep(type === 'meter' ? 'map-meters' : 'map-predictors');
    this.changed();
  }

  moveSelectedFacilityMappingItems(type: ImportMappingType, facilityId?: string): void {
    this.moveFacilityMappingItems(type, this.selectedMappingItemIds(), facilityId);
  }

  setGeneralWorkbookFacility(facilityId?: string): void {
    const normalizedFacilityId = facilityId || undefined;
    const draft = this.draft();
    if (!draft || draft.selectedFacilityId === normalizedFacilityId) return;
    const label = normalizedFacilityId
      ? draft.importFacilities.find(facility => facility.guid === normalizedFacilityId)?.name
      : 'Multiple facilities';
    if (!label) return;
    this.drafts.setGeneralWorkbookDefaultFacility(draft, normalizedFacilityId);
    this.selectedMappingItemIds.set([]);
    this.mappingAnnouncement.set(normalizedFacilityId
      ? `All meter and predictor columns default to ${label}.`
      : 'Meter and predictor columns reset to Unmapped.');
    this.invalidateFromStep('map-meters');
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
      if (!this.columnStepStatus().date.usable) return 'Choose a date column with at least one usable date.';
      if (!this.meterColumns().length && !this.predictorColumns().length) return 'Identify at least one meter or predictor column.';
    }
    if (step === 'map-meters' && this.unmappedCount('meter')) return 'Map all meter columns before continuing.';
    if (step === 'map-predictors' && this.unmappedCount('predictor')) return 'Map all predictor columns before continuing.';
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

  private invalidateGeneralColumnDependencies(): void {
    this.invalidateFromStep('columns');
  }

  private invalidateFromStep(stepId: string): void {
    const draft = this.draft();
    if (!draft) return;
    const stepIndex = this.steps().findIndex(step => step.id === stepId);
    if (stepIndex < 0) return;
    const invalidSteps = new Set(this.steps().slice(stepIndex).map(step => step.id));
    draft.completedSteps = draft.completedSteps.filter(step => !invalidSteps.has(step));
    this.error.set(undefined);
  }

  private mappingLane(value: {
    id: string;
    facilityId?: string;
    label: string;
    description: string;
    color: string;
    unmapped: boolean;
    items: readonly { id: string; value: string; index: number }[];
  }): ImportMappingLaneView {
    const cards = value.items
      .map(item => ({ id: item.id, label: item.value, index: item.index, facilityId: value.facilityId }))
      .sort((left, right) => left.index - right.index);
    return {
      id: value.id,
      facilityId: value.facilityId,
      label: value.label,
      description: value.description,
      color: value.color,
      unmapped: value.unmapped,
      cards,
      totalCount: cards.length
    };
  }

  private changed(): void {
    this.draftStore.changed();
  }

  private commitRequest(draft: ImportFileDraft) {
    return buildSpreadsheetImportCommitRequest(draft, this.workspace.account().guid);
  }

}

function columnLaneDescription(target: ColumnTarget): string {
  if (target === 'Worksheet Columns') return 'Columns here will not be uploaded.';
  if (target === 'Date') return 'Choose the single column that dates each reading.';
  if (target === 'Meters') return 'Energy, water, emissions, or other utility readings.';
  return 'Production, weather, occupancy, or other relevant variables.';
}

function columnLaneIcon(target: ColumnTarget): ImportColumnLaneView['icon'] {
  if (target === 'Worksheet Columns') return 'viewHidden';
  if (target === 'Date') return 'calendar';
  if (target === 'Meters') return 'meter';
  return 'predictor';
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
