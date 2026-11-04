import { FocusMonitor } from '@angular/cdk/a11y';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, PristineChangeEvent, ReactiveFormsModule, Validators } from '@angular/forms';
import { distinctUntilChanged, filter, map } from 'rxjs';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HasUnsavedChanges } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ConflictChoices, DraftConflict, draftEqual, reconcileFields } from '@app/v1/data/editing/draft-reconciliation';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { DEFAULT_TIME_PERIOD_PAGE_SIZE, TIME_PERIOD_PAGE_SIZE_OPTIONS } from '@shared/table-pagination';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { WeatherStation } from '@data/models/degreeDays';
import { WeatherMonth, WeatherMonthRange } from '@platform/weather/hourly-weather-data.models';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import {
  WeatherStationMonthCalculationValue,
  WeatherStationMonthDraft,
  WeatherStationGroupPreview,
  WeatherStationReadingRow,
  buildWeatherStationMonthChangeSet,
  buildWeatherStationMonthDeleteChangeSet,
  buildWeatherStationReadingMatrix,
  buildWeatherStationStatusChecks,
  validateWeatherMonthRange,
  weatherFutureMonthCount,
  weatherRangeForReadings
} from '../../models';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { WeatherPredictorActionsService } from '../../weather-predictor-actions.service';
import { WeatherReadingDeleteConfirmationModalComponent } from './weather-reading-delete-confirmation-modal/weather-reading-delete-confirmation-modal.component';
import { WeatherReadingMonthEditorComponent } from './weather-reading-month-editor/weather-reading-month-editor.component';
import { WeatherSourceReadingsSlideoutComponent } from '../../shared/weather-source-readings/weather-source-readings-slideout.component';
import { WeatherPredictorWorkbenchContextService } from '../weather-predictor-workbench-context.service';
import { weatherCalculationFingerprint, weatherEditIdentity } from '../weather-edit.models';

type EditorReplacement = { kind: 'close' | 'add' | 'range' } | { kind: 'edit' | 'delete'; row: WeatherStationReadingRow };

@Component({
  selector: 'app-weather-predictor-readings',
  templateUrl: './weather-predictor-readings.component.html',
  styleUrls: ['./weather-predictor-readings.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule, EditorConflictReviewComponent, ConfirmationDialogComponent,
    NgbPaginationModule,
    IconComponent,
    WorkspaceSlideoutComponent,
    WeatherReadingDeleteConfirmationModalComponent,
    WeatherReadingMonthEditorComponent,
    WeatherSourceReadingsSlideoutComponent
  ]
})
export class WeatherPredictorReadingsComponent implements HasUnsavedChanges, OnDestroy {
  private readonly actions = inject(WeatherPredictorActionsService);
  private readonly weatherWorkflow = inject(PredictorWeatherWorkflowService);
  private readonly copyTableService = inject(CopyTableService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly injector = inject(Injector);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly context = inject(WeatherPredictorWorkbenchContextService);
  readonly matrix = computed(() => buildWeatherStationReadingMatrix(
    this.context.predictors(), this.context.readings()
  ));
  readonly readingChecks = computed(() => {
    const group = this.context.group();
    return group
      ? buildWeatherStationStatusChecks(group.predictors, group.statusFindings ?? [])
        .filter(check => check.section === 'readings')
      : [];
  });
  readonly readingCheckCount = computed(() => this.readingChecks()
    .reduce((total, check) => total + check.findingCount, 0));
  readonly affectedPredictorCount = computed(() => new Set(
    this.readingChecks().flatMap(check => check.predictorGuids)
  ).size);
  readonly viewForm = new FormGroup({
    page: new FormControl(1, { nonNullable: true }),
    pageSize: new FormControl<number>(DEFAULT_TIME_PERIOD_PAGE_SIZE, { nonNullable: true }),
    rowFilter: new FormControl<'all' | 'attention'>('all', { nonNullable: true })
  });
  private readonly viewSnapshot = signal(this.viewForm.getRawValue());
  readonly currentPage = computed(() => this.viewSnapshot().page);
  readonly pageSizeOptions = [...TIME_PERIOD_PAGE_SIZE_OPTIONS];
  readonly pageSize = computed(() => this.viewSnapshot().pageSize);
  readonly rowFilter = computed(() => this.viewSnapshot().rowFilter);
  readonly copyingTable = signal(false);
  readonly rangeForm = new FormGroup({
    startMonth: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endMonth: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });
  private readonly rangeSnapshot = signal(this.rangeForm.getRawValue());
  private readonly rangeFormDirty = toSignal(this.rangeForm.events.pipe(
    filter((event): event is PristineChangeEvent => event instanceof PristineChangeEvent),
    map(event => !event.pristine), distinctUntilChanged()
  ), { initialValue: this.rangeForm.dirty });
  readonly startMonth = computed(() => this.rangeSnapshot().startMonth);
  readonly endMonth = computed(() => this.rangeSnapshot().endMonth);
  readonly rangeDirty = computed(() => this.rangeFormDirty() || this.rangeConflicts().length > 0);
  readonly rangeConflicts = signal<readonly DraftConflict[]>([]);
  readonly editIdentity = computed(() => weatherEditIdentity(this.workspace.account()?.guid, this.workspace.facility()?.guid, this.context.groupKey()));
  readonly rangePreview = signal<WeatherStationGroupPreview | undefined>(undefined);
  readonly rangeUpdateCompleted = signal(false);
  readonly updatingRange = signal(false);
  readonly rangeError = signal<string | undefined>(undefined);
  readonly selectedRange = computed(() => rangeFromInputs(this.startMonth(), this.endMonth()));
  readonly futureMonthCount = computed(() => {
    const range = this.selectedRange();
    return range ? weatherFutureMonthCount(range) : 0;
  });
  readonly filteredRows = computed(() => this.rowFilter() === 'attention'
    ? this.matrix().rows.filter(row => row.hasAttention)
    : this.matrix().rows);
  readonly maxPage = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize())));
  readonly displayedRows = computed(() => {
    const start = (Math.min(this.currentPage(), this.maxPage()) - 1) * this.pageSize();
    return this.filteredRows().slice(start, start + this.pageSize());
  });
  readonly existingMonthKeys = computed(() => this.matrix().rows.map(row => row.key));
  readonly editor = signal<{ mode: 'add' | 'edit'; row?: WeatherStationReadingRow; sessionKey: string } | undefined>(undefined);
  readonly editorRow = computed(() => {
    const panel = this.editor();
    return panel?.mode === 'edit' ? this.matrix().rows.find(row => row.key === panel.row?.key) : undefined;
  });
  readonly editorUnavailable = computed(() => this.editor()?.mode === 'edit' && !this.editorRow());
  readonly pendingReplacement = signal<EditorReplacement | undefined>(undefined);
  readonly sourceReadings = signal<{
    predictor: IdbPredictor;
    row: WeatherStationReadingRow;
  } | undefined>(undefined);
  readonly deleteRow = signal<WeatherStationReadingRow | undefined>(undefined);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly calculatedValues = signal<readonly WeatherStationMonthCalculationValue[]>([]);
  readonly calculatedMonth = signal<string | undefined>(undefined);
  readonly calculating = signal(false);
  readonly calculationError = signal<string | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite()
    && !!this.editIdentity() && !!this.context.group()
    && !this.workspace.hasPending() && !this.saving() && !this.updatingRange());
  readonly canUpdateRange = computed(() => {
    const group = this.context.group();
    const range = this.selectedRange();
    return !!group?.stationId
      && !!range
      && !validateWeatherMonthRange(range)
      && this.rangeConflicts().length === 0
      && this.canAct();
  });
  private calculationRequest = 0;
  private rangeRequest = 0;
  private editorSequence = 0;
  private copyTimer: ReturnType<typeof setTimeout> | undefined;
  private destroyed = false;
  private rangeCommitting = false;
  private rangeBaseline: { startMonth: string; endMonth: string } | undefined;
  private rangeConflictInput: { base: { startMonth: string; endMonth: string }; local: { startMonth: string; endMonth: string }; saved: { startMonth: string; endMonth: string } } | undefined;
  private lastIdentity: string | undefined;
  private lastCalculationFingerprint: string | undefined;
  private lastRevision: number | undefined;
  private deleteModalOpen = false;
  private returnFocus?: HTMLElement;
  private paginationGroupKey?: string;
  private readonly clampCurrentPage = effect(() => {
    const groupKey = this.editIdentity();
    const maxPage = this.maxPage();
    if (groupKey !== this.paginationGroupKey) {
      this.paginationGroupKey = groupKey;
      untracked(() => this.setCurrentPage(1));
    } else if (this.currentPage() > maxPage) {
      untracked(() => this.setCurrentPage(maxPage));
    }
  });
  private readonly synchronizeRange = effect(() => {
    const group = this.context.group();
    const readings = this.context.readings();
    const range = weatherRangeForReadings(readings) ?? this.workspace.defaultWeatherRange();
    const identity = this.editIdentity();
    const fingerprint = weatherCalculationFingerprint(this.context.predictors());
    const revision = this.workspace.revision();
    untracked(() => {
      if (!identity) return;
      if (identity !== this.lastIdentity) {
        this.saving.set(false);
        this.updatingRange.set(false);
        this.rangeCommitting = false;
        this.discardChanges();
        this.copyingTable.set(false);
        this.lastIdentity = identity;
        this.rangeBaseline = undefined;
      }
      if (group) this.synchronizeSavedRange({ startMonth: range ? toMonthInput(range.start) : '', endMonth: range ? toMonthInput(range.end) : '' });
      if (fingerprint !== this.lastCalculationFingerprint && this.lastCalculationFingerprint !== undefined) {
        this.resetCalculation();
        if (this.editor()?.mode === 'add') this.calculationError.set('Weather setup changed. Recalculate this month or enter manual overrides.');
      }
      if (revision !== this.lastRevision && !this.rangeCommitting) this.invalidateRangeReview();
      this.lastRevision = revision;
      this.lastCalculationFingerprint = fingerprint;
    });
  });
  private readonly rangeEnabledEffect = effect(() => {
    const enabled = this.canAct() && !this.calculating() && this.rangeConflicts().length === 0;
    untracked(() => enabled ? this.rangeForm.enable({ emitEvent: false }) : this.rangeForm.disable({ emitEvent: false }));
  });
  private readonly monthEditor = viewChild(WeatherReadingMonthEditorComponent);
  readonly hasDraftChanges = computed(() => this.rangeDirty() || !!this.monthEditor()?.dirty());
  @ViewChild('weatherReadingDeleteModal') private readonly weatherReadingDeleteModal?: TemplateRef<unknown>;
  @ViewChild('replaceWeatherMonthModal') private readonly replaceWeatherMonthModal?: TemplateRef<unknown>;
  @ViewChild('readingsRegion', { read: ElementRef }) private readonly readingsRegion?: ElementRef<HTMLElement>;
  @ViewChild('weatherReadingsTable', { read: ElementRef }) private readonly weatherReadingsTable?: ElementRef<HTMLTableElement>;

  constructor() {
    registerDataDraft(this.hasDraftChanges, () => this.discardChanges(), computed(() => this.isNavigationBlocked()));
    this.rangeForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const value = this.rangeForm.getRawValue();
      if (draftEqual(value, this.rangeSnapshot())) return;
      this.rangeForm.markAsDirty(); this.rangeSnapshot.set(value); this.markRangeChanged();
    });
    this.viewForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const value = this.viewForm.getRawValue();
      if (draftEqual(value, this.viewSnapshot())) return;
      if (value.pageSize !== this.pageSize() || value.rowFilter !== this.rowFilter()) {
        this.viewForm.controls.page.setValue(1, { emitEvent: false });
      }
      this.viewSnapshot.set(this.viewForm.getRawValue());
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.rangeRequest++;
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.resetCalculation();
    this.hideDeleteModal();
    if (this.pendingReplacement()) this.modalPortal.hide();
  }
  hasUnsavedChanges(): boolean { return this.hasDraftChanges(); }
  isNavigationBlocked(): boolean {
    return this.saving() || this.calculating() || this.updatingRange() || this.weatherWorkflow.busy();
  }

  setStartMonth(value: string): void {
    if (!this.canAct()) return;
    this.rangeForm.controls.startMonth.setValue(value);
  }

  setEndMonth(value: string): void {
    if (!this.canAct()) return;
    this.rangeForm.controls.endMonth.setValue(value);
  }

  async reviewRangeUpdate(event?: Event): Promise<void> {
    const group = this.context.group();
    const range = this.selectedRange();
    if (!group?.stationId || !range || !this.canUpdateRange()) return;
    if (this.deferEditorReplacement({ kind: 'range' })) return;
    this.closeEditor(true);
    this.captureFocus(event);
    this.rangeError.set(undefined);
    this.rangeUpdateCompleted.set(false);
    this.updatingRange.set(true);
    const request = ++this.rangeRequest;
    const identity = this.editIdentity();
    const revision = this.workspace.revision();
    const submitted = this.rangeForm.getRawValue();
    try {
      const preview = await this.weatherWorkflow.previewStationGroup({
        sourceGroupKey: group.routeKey,
        station: { ID: group.stationId, name: group.stationName } as WeatherStation,
        range,
        definitions: group.predictors.map(predictor => ({
          predictorGuid: predictor.guid,
          weatherDataType: predictor.weatherDataType,
          name: predictor.name,
          baseTemperature: predictor.weatherDataType === 'HDD'
            ? predictor.heatingBaseTemperature
            : predictor.weatherDataType === 'CDD' ? predictor.coolingBaseTemperature : undefined,
          production: !!predictor.production
        }))
      }, group.predictors, this.context.readings());
      if (!this.acceptRangeRequest(request, identity) || revision !== this.workspace.revision()
        || !draftEqual(submitted, this.rangeForm.getRawValue())) return;
      if (preview) this.rangePreview.set(preview);
      else this.rangeError.set(this.weatherWorkflow.state().error || 'The reading update could not be prepared.');
    } catch (error) {
      if (this.acceptRangeRequest(request, identity)) this.rangeError.set(error instanceof Error ? error.message : 'The reading update could not be prepared.');
    } finally {
      if (this.acceptRangeRequest(request, identity)) this.updatingRange.set(false);
    }
  }

  async confirmRangeUpdate(): Promise<void> {
    const preview = this.rangePreview();
    if (!preview || this.updatingRange()) return;
    if (preview.workspaceRevision !== this.workspace.revision() || this.rangeConflicts().length || !this.context.group()) {
      this.invalidateRangeReview(); this.rangeError.set('Saved weather data changed. Review the reading update again.'); return;
    }
    const identity = this.editIdentity();
    const submitted = this.rangeForm.getRawValue();
    this.rangeError.set(undefined);
    this.updatingRange.set(true);
    this.rangeCommitting = true;
    try {
      await this.weatherWorkflow.commitStationGroup(preview);
      if (this.destroyed || identity !== this.editIdentity()) return;
      if (draftEqual(submitted, this.rangeForm.getRawValue())) {
        this.rangeForm.markAsPristine();
      }
      this.rangeUpdateCompleted.set(true);
    } catch (error) {
      if (!this.destroyed && identity === this.editIdentity()) this.rangeError.set(error instanceof Error ? error.message : 'The readings could not be updated.');
    } finally {
      if (!this.destroyed && identity === this.editIdentity()) {
        this.rangeCommitting = false;
        this.updatingRange.set(false);
      }
    }
  }

  closeRangeUpdate(): void {
    if (this.updatingRange()) return;
    this.rangePreview.set(undefined);
    this.rangeUpdateCompleted.set(false);
    this.rangeError.set(undefined);
    this.weatherWorkflow.reset();
    this.restoreFocus();
  }

  openAdd(event?: Event): void {
    if (this.canAct()) {
      if (this.deferEditorReplacement({ kind: 'add' })) return;
      this.captureFocus(event);
      this.actionError.set(undefined);
      this.resetCalculation();
      this.editor.set({ mode: 'add', sessionKey: `weather-month-${++this.editorSequence}` });
    }
  }
  openEdit(row: WeatherStationReadingRow, event?: Event): void {
    if (this.canAct()) {
      if (this.deferEditorReplacement({ kind: 'edit', row })) return;
      this.resetCalculation(); this.captureFocus(event); this.actionError.set(undefined);
      this.editor.set({ mode: 'edit', row, sessionKey: `weather-month-${++this.editorSequence}` });
    }
  }
  requestCloseEditor(): void {
    if (this.saving()) return;
    if (!this.monthEditor()?.dirty()) this.closeEditor();
    else this.deferEditorReplacement({ kind: 'close' });
  }
  requestDelete(row: WeatherStationReadingRow, event?: Event): void {
    if (!this.canAct()) return;
    if (this.deferEditorReplacement({ kind: 'delete', row })) return;
    this.captureFocus(event);
    this.deleteRow.set(row);
    this.actionError.set(undefined);
    this.showDeleteModal();
  }
  openSourceReadings(row: WeatherStationReadingRow, predictorGuid: string, event?: Event): void {
    const predictor = this.context.predictors()
      .find(candidate => candidate.guid === predictorGuid);
    if (!predictor) return;
    this.captureFocus(event);
    this.sourceReadings.set({ predictor, row });
  }
  closeSourceReadings(): void {
    this.sourceReadings.set(undefined);
    this.restoreFocus();
  }

  async calculateMonth(month?: WeatherMonth): Promise<void> {
    const request = ++this.calculationRequest;
    this.calculatedValues.set([]);
    this.calculationError.set(undefined);
    this.calculatedMonth.set(undefined);
    if (!month) {
      if (this.calculating()) this.weatherWorkflow.cancel();
      this.calculating.set(false);
      return;
    }
    const group = this.context.group();
    const editor = this.editor();
    if (!group || editor?.mode !== 'add') return;
    const identity = this.editIdentity();
    const session = editor.sessionKey;
    const fingerprint = weatherCalculationFingerprint(group.predictors);
    this.calculating.set(true);
    try {
      const values = await this.weatherWorkflow.calculateStationMonth(group.predictors, month);
      if (!this.acceptCalculation(request, identity, session, fingerprint)) return;
      this.calculatedMonth.set(toMonthInput(month));
      if (values) this.calculatedValues.set(values);
      else this.calculationError.set(this.weatherWorkflow.state().error || 'Calculated weather values are unavailable for this month.');
    } catch (error) {
      if (this.acceptCalculation(request, identity, session, fingerprint)) this.calculationError.set(error instanceof Error ? error.message : 'Calculated weather values are unavailable for this month.');
    } finally {
      if (this.acceptCalculation(request, identity, session, fingerprint)) this.calculating.set(false);
    }
  }

  async saveMonth(draft: WeatherStationMonthDraft): Promise<void> {
    const panel = this.editor();
    const group = this.context.group();
    if (!panel || !group || !this.canAct()) return;
    if (panel.mode === 'edit' && !this.editorRow()) { this.actionError.set('This saved month was removed and cannot be recreated by saving this draft.'); return; }
    const identity = this.editIdentity();
    try {
      const changes = buildWeatherStationMonthChangeSet(
        panel.mode, group.routeKey, group.predictors, this.context.readings(), draft, this.workspace.revision()
      );
      this.saving.set(true);
      await this.actions.applyWeatherStationMonth(changes);
      if (!this.destroyed && identity === this.editIdentity() && panel.sessionKey === this.editor()?.sessionKey) this.closeEditor(true);
    } catch (error) {
      if (!this.destroyed && identity === this.editIdentity()) this.actionError.set(error instanceof Error ? error.message : 'The station month could not be saved.');
    } finally { if (!this.destroyed && identity === this.editIdentity()) this.saving.set(false); }
  }

  async confirmDelete(): Promise<void> {
    const row = this.deleteRow();
    const group = this.context.group();
    if (!row || !group || !this.canAct()) return;
    const identity = this.editIdentity();
    try {
      this.saving.set(true);
      await this.actions.applyWeatherStationMonth(buildWeatherStationMonthDeleteChangeSet(
        group.routeKey, group.predictors, this.context.readings(), row.year, row.month, this.workspace.revision()
      ));
      if (!this.destroyed && identity === this.editIdentity()) this.closeDelete();
    } catch (error) {
      if (!this.destroyed && identity === this.editIdentity()) this.actionError.set(error instanceof Error ? error.message : 'The station month could not be deleted.');
    } finally { if (!this.destroyed && identity === this.editIdentity()) this.saving.set(false); }
  }

  cancelDelete(): void { if (!this.saving()) this.closeDelete(); }
  setPageSize(value: string): void {
    const size = Number(value);
    if (this.pageSizeOptions.includes(size as 12 | 24 | 36)) this.viewForm.controls.pageSize.setValue(size);
  }

  setRowFilter(value: string): void {
    this.viewForm.controls.rowFilter.setValue(value === 'attention' ? 'attention' : 'all');
  }

  setCurrentPage(value: number): void {
    this.viewForm.controls.page.setValue(value, { emitEvent: false }); this.viewSnapshot.set(this.viewForm.getRawValue());
  }

  copyTable(): void {
    if (!this.weatherReadingsTable) return;
    const identity = this.editIdentity();
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copyingTable.set(true);
    this.copyTimer = setTimeout(() => {
      if (this.destroyed || identity !== this.editIdentity()) return;
      this.copyTableService.copyTable(this.weatherReadingsTable);
      this.copyingTable.set(false);
    }, 200);
  }

  private closeEditor(force = false): void {
    if (!force && this.saving()) return;
    this.resetCalculation();
    this.editor.set(undefined);
    this.actionError.set(undefined);
    this.restoreFocus();
  }
  private discardChanges(): void {
    this.closeEditor(true);
    this.invalidateRangeReview();
    this.rangeError.set(undefined);
    this.rangeConflictInput = undefined;
    this.rangeConflicts.set([]);
    const range = weatherRangeForReadings(this.context.readings()) ?? this.workspace.defaultWeatherRange();
    this.patchRange({ startMonth: range ? toMonthInput(range.start) : '', endMonth: range ? toMonthInput(range.end) : '' }, true);
    if (this.pendingReplacement()) { this.pendingReplacement.set(undefined); this.modalPortal.hide(); }
  }
  private markRangeChanged(): void {
    this.invalidateRangeReview();
    this.rangeError.set(undefined);
  }
  private resetCalculation(): void {
    this.calculationRequest++;
    if (this.calculating()) this.weatherWorkflow.cancel();
    this.calculating.set(false);
    this.calculatedValues.set([]);
    this.calculatedMonth.set(undefined);
    this.calculationError.set(undefined);
    this.weatherWorkflow.reset();
  }
  private showDeleteModal(): void {
    if (!this.weatherReadingDeleteModal) return;
    this.deleteModalOpen = true;
    this.modalPortal.show(new TemplatePortal(this.weatherReadingDeleteModal, this.viewContainerRef));
  }
  private hideDeleteModal(): void {
    if (!this.deleteModalOpen) return;
    this.deleteModalOpen = false;
    this.modalPortal.hide();
  }
  private closeDelete(): void {
    this.deleteRow.set(undefined);
    this.hideDeleteModal();
    this.restoreFocus();
  }
  private captureFocus(event?: Event): void { this.returnFocus = event?.currentTarget as HTMLElement | undefined; }
  private restoreFocus(): void {
    afterNextRender(() => {
      if (this.destroyed) return;
      const target = this.returnFocus?.isConnected ? this.returnFocus : this.readingsRegion?.nativeElement;
      if (target) this.focusMonitor.focusVia(target, 'program');
      this.returnFocus = undefined;
    }, { injector: this.injector });
  }

  resolveRangeConflicts(choices: ConflictChoices): void {
    const input = this.rangeConflictInput;
    if (input) this.mergeRange(input.base, input.local, input.saved, choices);
  }

  confirmEditorReplacement(): void {
    if (this.saving() || this.calculating()) return;
    const action = this.pendingReplacement();
    this.cancelEditorReplacement();
    this.closeEditor(true);
    if (action?.kind === 'add') this.openAdd();
    else if (action?.kind === 'edit') this.openEdit(action.row);
    else if (action?.kind === 'delete') this.requestDelete(action.row);
    else if (action?.kind === 'range') void this.reviewRangeUpdate();
  }

  cancelEditorReplacement(): void { this.pendingReplacement.set(undefined); this.modalPortal.hide(); }

  private deferEditorReplacement(action: EditorReplacement): boolean {
    if (!this.editor() || !this.monthEditor()?.dirty()) return false;
    if (!this.replaceWeatherMonthModal) return true;
    this.pendingReplacement.set(action);
    this.modalPortal.show(new TemplatePortal(this.replaceWeatherMonthModal, this.viewContainerRef));
    return true;
  }

  private synchronizeSavedRange(saved: { startMonth: string; endMonth: string }): void {
    if (!this.rangeBaseline) {
      this.rangeBaseline = saved; this.patchRange(saved, true); return;
    }
    if (draftEqual(saved, this.rangeBaseline)) return;
    this.mergeRange(this.rangeConflictInput?.base ?? this.rangeBaseline,
      this.rangeConflictInput?.local ?? this.rangeForm.getRawValue(), saved);
  }

  private mergeRange(base: { startMonth: string; endMonth: string }, local: { startMonth: string; endMonth: string },
    saved: { startMonth: string; endMonth: string }, choices: ConflictChoices = {}): void {
    const merged = reconcileFields(base, local, saved, { choices });
    this.rangeBaseline = saved;
    this.rangeConflictInput = merged.conflicts.length ? { base: merged.baseline ?? saved, local: merged.value, saved } : undefined;
    this.rangeConflicts.set(merged.conflicts);
    this.patchRange(merged.value, draftEqual(merged.value, saved));
    if (!this.rangeCommitting) this.invalidateRangeReview();
  }

  private patchRange(value: { startMonth: string; endMonth: string }, pristine: boolean): void {
    this.rangeForm.patchValue(value, { emitEvent: false });
    pristine ? this.rangeForm.markAsPristine() : this.rangeForm.markAsDirty();
    this.rangeSnapshot.set(this.rangeForm.getRawValue());
  }

  private invalidateRangeReview(): void {
    this.rangeRequest++;
    this.rangePreview.set(undefined); this.rangeUpdateCompleted.set(false);
    if (!this.rangeCommitting) {
      if (this.updatingRange()) this.weatherWorkflow.reset();
      this.updatingRange.set(false);
    }
  }

  private acceptRangeRequest(request: number, identity: string | undefined): boolean {
    return !this.destroyed && request === this.rangeRequest && identity === this.editIdentity();
  }

  private acceptCalculation(request: number, identity: string | undefined, session: string, fingerprint: string): boolean {
    return !this.destroyed && request === this.calculationRequest && identity === this.editIdentity()
      && this.editor()?.sessionKey === session && this.editor()?.mode === 'add'
      && fingerprint === weatherCalculationFingerprint(this.context.predictors());
  }
}

function rangeFromInputs(start: string, end: string): WeatherMonthRange | undefined {
  const startMonth = parseMonthInput(start);
  const endMonth = parseMonthInput(end);
  return startMonth && endMonth ? { start: startMonth, end: endMonth } : undefined;
}

function parseMonthInput(value: string): WeatherMonth | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : undefined;
}

function toMonthInput(month: WeatherMonth): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`;
}
