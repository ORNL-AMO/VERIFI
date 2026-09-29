import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SpreadsheetImportCommandService } from '@data/import/spreadsheet-import-command.service';
import { SpreadsheetImportDraftService } from '@data/import/spreadsheet-import-draft.service';
import { ImportCommitRequest, ImportFileDraft } from '@data/import/spreadsheet-import.models';
import { isMeterInvalid } from '@domain/calculations/status-check-calculations/validation/meterValidation';
import { HasUnsavedChanges } from '@app/v1/account/data/unsaved-changes.guard';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ImportSessionService } from '../import-session.service';
import { ImportStepDefinition, stepsForDraft } from '../import-workflow.config';
import { ImportStepperComponent } from '../import-stepper/import-stepper.component';

@Component({
  selector: 'app-import-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ImportStepperComponent],
  templateUrl: './import-wizard.component.html',
  styleUrls: ['./import-wizard.component.css']
})
export class ImportWizardComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  readonly isMeterInvalid = isMeterInvalid;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly drafts = inject(SpreadsheetImportDraftService);
  private readonly commands = inject(SpreadsheetImportCommandService);
  private readonly unsaved = inject(UnsavedChangesService);
  readonly session = inject(ImportSessionService);
  readonly workspace = inject(AccountWorkspaceStore);
  readonly draft = signal<ImportFileDraft | undefined>(undefined);
  readonly currentStepId = signal('');
  readonly error = signal<string | undefined>(undefined);
  readonly committed = signal(false);
  readonly steps = computed(() => this.draft() ? stepsForDraft(this.draft()) : []);
  readonly currentStep = computed(() => this.steps().find(step => step.id === this.currentStepId()));
  readonly meterColumns = computed(() => this.groupItems('Meters'));
  readonly predictorColumns = computed(() => this.groupItems('Predictors'));
  private readonly subscription = new Subscription();
  private unregisterUnsaved?: () => void;

  ngOnInit(): void {
    this.unregisterUnsaved = this.unsaved.register(
      () => this.hasUnsavedChanges(),
      () => this.session.clear(),
      () => this.isNavigationBlocked()
    );
    this.subscription.add(this.route.paramMap.subscribe(params => {
      const draft = this.session.draft(params.get('fileId'));
      if (!draft) {
        this.redirectForMissingSession();
        return;
      }
      const requestedStep = params.get('step');
      const steps = stepsForDraft(draft);
      const requestedIndex = steps.findIndex(step => step.id === requestedStep);
      const firstIncompleteIndex = steps.findIndex(step => !draft.completedSteps.includes(step.id));
      const maxIndex = firstIncompleteIndex < 0 ? steps.length - 1 : firstIncompleteIndex;
      if (requestedIndex < 0 || requestedIndex > maxIndex) {
        this.goToStep(steps[Math.max(0, maxIndex)].id, draft);
        return;
      }
      this.draft.set(draft);
      this.currentStepId.set(requestedStep);
      this.error.set(undefined);
      if (draft.kind === 'general-workbook' && ['map-meters', 'map-predictors'].includes(requestedStep) &&
        draft.meterFacilityGroups.length === 0 && draft.predictorFacilityGroups.length === 0) {
        this.drafts.initializeFacilityMappings(draft);
        this.session.notifyChanged();
      }
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.unregisterUnsaved?.();
  }

  hasUnsavedChanges(): boolean { return !this.committed() && this.session.hasUnsavedChanges(); }
  isNavigationBlocked(): boolean { return this.session.pending(); }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges() || this.isNavigationBlocked()) event.preventDefault();
  }

  selectWorksheet(name: string): void {
    this.drafts.selectWorksheet(this.draft(), name);
    this.changed();
  }

  assignColumn(itemId: string, target: string): void {
    this.drafts.assignColumn(this.draft(), itemId, target as any);
    this.changed();
  }

  mapColumn(type: 'meter' | 'predictor', itemId: string, facilityId: string): void {
    this.drafts.mapColumnToFacility(this.draft(), type, itemId, facilityId || undefined);
    this.changed();
  }

  setFootprintFacility(facilityId: string): void {
    this.drafts.applyFootprintFacility(this.draft(), facilityId);
    this.changed();
  }

  toggleEquipmentMeterGroup(equipmentIndex: number, groupId: string, checked: boolean): void {
    const ids = this.draft().facilityEnergyUseEquipment[equipmentIndex].utilityMeterGroupIds;
    if (checked && !ids.includes(groupId)) ids.push(groupId);
    if (!checked) this.draft().facilityEnergyUseEquipment[equipmentIndex].utilityMeterGroupIds = ids.filter(id => id !== groupId);
    this.changed();
  }

  toggleExcludedReading(readingIndex: number, excluded: boolean): void {
    const reading = this.draft().meterData[readingIndex];
    const key = reading.id ?? reading.guid;
    const exclusions = this.draft().excludedMeterReadingIds;
    if (excluded && !exclusions.map(String).includes(String(key))) exclusions.push(key);
    if (!excluded) this.draft().excludedMeterReadingIds = exclusions.filter(value => String(value) !== String(key));
    this.changed();
  }

  isReadingExcluded(readingIndex: number): boolean {
    const reading = this.draft().meterData[readingIndex];
    return this.draft().excludedMeterReadingIds.map(String).includes(String(reading.id ?? reading.guid));
  }

  readingInvalid(readingIndex: number): boolean {
    const reading = this.draft().meterData[readingIndex];
    return !(Number.isInteger(reading.year) && reading.year > 1900 &&
      Number.isInteger(reading.month) && reading.month >= 1 && reading.month <= 12 &&
      Number.isInteger(reading.day) && reading.day >= 1 && reading.day <= 31 &&
      [reading.totalEnergyUse, reading.totalVolume, reading.totalImportConsumption]
        .filter(value => value !== undefined && value !== null)
        .every(value => Number.isFinite(Number(value))));
  }

  openCompletedStep(stepId: string): void {
    const draft = this.draft();
    if (stepId === this.currentStepId() || draft.completedSteps.includes(stepId)) this.goToStep(stepId, draft);
  }

  back(): void {
    const index = this.steps().findIndex(step => step.id === this.currentStepId());
    if (index > 0) this.goToStep(this.steps()[index - 1].id);
    else this.openUpload();
  }

  continue(): void {
    const draft = this.draft();
    const issue = this.validationMessage();
    if (issue) {
      this.error.set(issue);
      return;
    }
    this.error.set(undefined);
    if (!draft.completedSteps.includes(this.currentStepId())) draft.completedSteps.push(this.currentStepId());
    if (draft.kind === 'general-workbook') this.drafts.materializeGeneralRecords(draft);
    this.changed();
    const index = this.steps().findIndex(step => step.id === this.currentStepId());
    if (index < this.steps().length - 1) this.goToStep(this.steps()[index + 1].id);
  }

  async commit(): Promise<void> {
    const issue = this.validationMessage();
    if (issue) { this.error.set(issue); return; }
    const draft = this.draft();
    this.session.setPending(true);
    draft.status = 'importing';
    this.changed();
    try {
      const summary = await this.commands.commit(this.commitRequest(draft));
      this.session.complete(draft.id, summary);
      this.committed.set(true);
      const next = this.session.nextReady(draft.id);
      if (next) {
        this.goToStep(stepsForDraft(next)[0].id, next);
      }
    } catch (error) {
      draft.status = 'ready';
      this.error.set(error instanceof Error ? error.message : String(error));
      this.changed();
    } finally {
      this.session.setPending(false);
    }
  }

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

  openUpload(): void {
    const accountGuid = this.workspace.account()?.guid;
    void this.router.navigate(['/v1/workspace/account', accountGuid, 'imports', 'upload']);
  }

  worksheetNames(): string[] { return this.draft() ? this.drafts.visibleWorksheetNames(this.draft().workbook) : []; }

  mappingItems(type: 'meter' | 'predictor') {
    const groups = type === 'meter' ? this.draft()?.meterFacilityGroups : this.draft()?.predictorFacilityGroups;
    return (groups ?? []).flatMap(group => group.groupItems.map(item => ({ ...item, facilityId: group.facilityName.startsWith('Unmapped') ? '' : group.facilityId })));
  }

  columnTarget(itemId: string): string {
    return this.draft()?.columnGroups.find(group => group.groupItems.some(item => item.id === itemId))?.groupLabel ?? 'Worksheet Columns';
  }

  allColumns() {
    return this.draft()?.columnGroups.flatMap(group => group.groupItems).sort((a, b) => a.index - b.index) ?? [];
  }

  invalidReadingCount(): number { return this.draft()?.meterData.filter((_, index) => this.readingInvalid(index)).length ?? 0; }

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

  private unmappedCount(type: 'meter' | 'predictor'): number {
    const groups = type === 'meter' ? this.draft()?.meterFacilityGroups : this.draft()?.predictorFacilityGroups;
    return groups?.find(group => group.facilityName.startsWith('Unmapped'))?.groupItems.length ?? 0;
  }

  private groupItems(label: string) {
    return this.draft()?.columnGroups.find(group => group.groupLabel === label)?.groupItems ?? [];
  }

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
      facilities: draft.kind === 'general-workbook'
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

  private changed(): void { this.session.notifyChanged(); }

  private goToStep(stepId: string, draft = this.draft()): void {
    const accountGuid = this.workspace.account()?.guid;
    void this.router.navigate(['/v1/workspace/account', accountGuid, 'imports', 'file', draft.id, stepId]);
  }

  private redirectForMissingSession(): void {
    const accountGuid = this.route.snapshot.parent?.parent?.paramMap.get('accountGuid') ?? this.workspace.account()?.guid;
    void this.router.navigate(['/v1/workspace/account', accountGuid, 'imports', 'upload'], { queryParams: { sessionLost: 1 } });
  }
}
