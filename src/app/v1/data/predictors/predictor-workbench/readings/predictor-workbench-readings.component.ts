import { FocusMonitor } from '@angular/cdk/a11y';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  Component,
  DestroyRef,
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
  viewChild,
  untracked
} from '@angular/core';
import { HasUnsavedChanges } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { StatusItem } from '@app/v1/status/status.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbPredictor, isStandardPredictor } from '@data/models/idbModels/predictor';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import {
  PredictorReadingEditorMode,
  PredictorReadingSaveRequest,
  PredictorReadingsConfirmation,
  buildPredictorReadingTableView,
  createPredictorReading,
  findMissingPredictorMonths
} from '../../models';
import { StandardPredictorActionsService } from '../../standard-predictor-actions.service';
import { PredictorWorkbenchContextService } from '../predictor-workbench-context.service';
import { PredictorReadingEditorComponent } from './predictor-reading-editor/predictor-reading-editor.component';
import { PredictorReadingsConfirmationModalComponent } from './predictor-readings-confirmation-modal/predictor-readings-confirmation-modal.component';
import { PredictorReadingsTableComponent } from './predictor-readings-table/predictor-readings-table.component';

interface PredictorReadingPanelState {
  readonly mode: PredictorReadingEditorMode;
  readonly reading: IdbPredictorData;
  readonly predictor: IdbPredictor;
}

@Component({
  selector: 'app-predictor-workbench-readings',
  templateUrl: './predictor-workbench-readings.component.html',
  styleUrls: ['./predictor-workbench-readings.component.css'],
  standalone: true,
  imports: [
    IconComponent,
    PredictorReadingEditorComponent,
    PredictorReadingsConfirmationModalComponent,
    PredictorReadingsTableComponent
  ]
})
export class PredictorWorkbenchReadingsComponent implements HasUnsavedChanges, OnDestroy {
  private readonly actions = inject(StandardPredictorActionsService);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly context = inject(PredictorWorkbenchContextService);
  readonly status = inject(WorkspaceStatusService);

  readonly editorPanel = signal<PredictorReadingPanelState | undefined>(undefined);
  readonly confirmation = signal<PredictorReadingsConfirmation | undefined>(undefined);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly actionStatus = signal('');
  readonly canAct = computed(() => !!this.context.predictor() && isStandardPredictor(this.context.predictor()!)
    && this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly tableView = computed(() => buildPredictorReadingTableView(
    this.context.predictor(),
    this.context.readings()
  ));
  readonly missingMonths = computed(() => findMissingPredictorMonths(this.context.readings()));
  readonly findings = computed(() => this.context.findings().filter(finding =>
    finding.destination.kind === 'predictor-tab' && finding.destination.tab === 'readings'));

  private confirmationModalOpen = false;
  private actionGeneration = 0;
  private returnFocusTarget?: HTMLElement;
  readonly navigationBlocked = computed(() => this.saving() || this.workspace.hasPending());
  constructor() {
    // The reusable editor owns its draft; the route also protects pending table actions.
    registerDataDraft(computed(() => false), () => {}, this.navigationBlocked);
  }
  private readonly selectedPredictorGuid = computed(() => [this.workspace.account()?.guid, this.workspace.facility()?.guid,
    this.context.predictorGuid()].join(':'));
  private readonly resetOnPredictorChange = effect(() => {
    this.selectedPredictorGuid();
    untracked(() => {
      this.actionGeneration++;
      this.saving.set(false);
      this.editorPanel.set(undefined);
      this.confirmation.set(undefined);
      this.hideConfirmationModal();
      this.actionError.set(undefined);
    });
  });

  private readonly editor = viewChild(PredictorReadingEditorComponent);
  readonly dirty = computed(() => this.editor()?.dirty() ?? false);
  @ViewChild(PredictorReadingsTableComponent) private readonly table?: PredictorReadingsTableComponent;
  @ViewChild('readingsConfirmationModal') private readonly readingsConfirmationModal?: TemplateRef<unknown>;
  @ViewChild('readingsRegion', { read: ElementRef }) private readonly readingsRegion?: ElementRef<HTMLElement>;

  ngOnDestroy(): void {
    this.hideConfirmationModal();
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  isNavigationBlocked(): boolean {
    return this.navigationBlocked();
  }

  async discardWarning(item: StatusItem): Promise<void> {
    if (await this.status.discardWarning(item)) {
      afterNextRender(() => {
        if (this.readingsRegion) {
          this.focusMonitor.focusVia(this.readingsRegion, 'program');
        }
      }, { injector: this.injector });
    }
  }

  openAddReading(): void {
    const predictor = this.context.predictor();
    if (!predictor || !this.canAct() || !this.canReplaceEditor()) return;
    this.captureFocus();
    this.editorPanel.set({
      mode: 'add',
      reading: createPredictorReading(predictor, this.context.readings()), predictor: structuredClone(predictor)
    });
    this.actionError.set(undefined);
  }

  openEditReading(reading: IdbPredictorData): void {
    const predictor = this.context.predictor();
    if (!predictor || !this.canAct() || !this.canReplaceEditor()
      || !this.context.readings().some(current => current.guid === reading.guid && current.predictorId === predictor.guid)) return;
    this.captureFocus();
    this.editorPanel.set({ mode: 'edit', reading: structuredClone(reading), predictor: structuredClone(predictor) });
    this.actionError.set(undefined);
  }

  requestCloseEditor(): void {
    if (this.saving()) return;
    if (!this.hasUnsavedChanges()) {
      this.closeEditor();
      return;
    }
    if (this.unsavedChanges.confirmDiscard()) this.closeEditor(true);
  }

  async saveReading(request: PredictorReadingSaveRequest): Promise<void> {
    const predictor = this.context.predictor();
    const panel = this.editorPanel();
    if (!predictor || !panel || !this.canAct() || this.editor()?.conflicts().length) return;
    if (request.reading.guid !== panel.reading.guid || request.reading.predictorId !== predictor.guid
      || request.reading.accountId !== predictor.accountId || request.reading.facilityId !== predictor.facilityId
      || !Number.isFinite(request.reading.amount) || (!predictor.canBeNegative && request.reading.amount < 0)
      || !Number.isInteger(request.reading.year) || request.reading.year < 1
      || !Number.isInteger(request.reading.month) || request.reading.month < 1 || request.reading.month > 12) {
      this.actionError.set('The reading no longer matches this editor or contains an invalid value.');
      return;
    }
    const current = panel.mode === 'edit' ? this.context.readings().find(reading => reading.guid === panel.reading.guid) : panel.reading;
    if (!current) { this.actionError.set('The saved reading is no longer available. Your draft has been retained.'); return; }
    if (this.context.readings().some(reading => reading.guid !== request.reading.guid
      && reading.year === request.reading.year && reading.month === request.reading.month)) {
      this.actionError.set('A reading already exists for this month.');
      return;
    }
    const updated = { ...structuredClone(current), year: request.reading.year, month: request.reading.month,
      amount: request.reading.amount, notes: request.reading.notes };
    const identity = this.selectedPredictorGuid();
    await this.runAction('The predictor reading could not be saved.', async () => {
      const saved = panel.mode === 'add'
        ? await this.actions.addPredictorReading(updated)
        : await this.actions.updatePredictorReading(updated);
      if (this.destroy.destroyed || this.selectedPredictorGuid() !== identity || this.editorPanel() !== panel) return;
      if (panel.mode === 'add' && request.addAnother) {
        const readings = [...this.context.readings().filter(reading => reading.guid !== saved.guid), saved];
        this.editorPanel.set({ mode: 'add', reading: createPredictorReading(predictor, readings), predictor: structuredClone(predictor) });
      } else {
        this.closeEditor(true);
      }
      this.actionStatus.set('Predictor reading saved.');
    });
  }

  requestDelete(reading: IdbPredictorData): void {
    if (!this.canAct() || !this.canReplaceEditor()) return;
    this.captureFocus();
    this.actionError.set(undefined);
    this.confirmation.set({ kind: 'delete-one', reading });
    this.showConfirmationModal();
  }

  requestBulkDelete(readings: readonly IdbPredictorData[]): void {
    if (!this.canAct() || readings.length === 0 || !this.canReplaceEditor()) return;
    this.captureFocus();
    this.actionError.set(undefined);
    this.confirmation.set({ kind: 'delete-many', readings });
    this.showConfirmationModal();
  }

  requestFillMissing(): void {
    const months = this.missingMonths();
    if (!this.canAct() || months.length === 0 || !this.canReplaceEditor()) return;
    this.captureFocus();
    this.actionError.set(undefined);
    this.confirmation.set({ kind: 'fill-missing', months });
    this.showConfirmationModal();
  }

  cancelConfirmation(): void {
    if (!this.saving()) this.closeConfirmation();
  }

  async confirmPendingAction(): Promise<void> {
    const confirmation = this.confirmation();
    const predictor = this.context.predictor();
    if (!confirmation || !predictor) return;
    const generation = this.actionGeneration;
    const isCurrent = () => !this.destroy.destroyed && generation === this.actionGeneration;
    switch (confirmation.kind) {
      case 'delete-one':
        await this.runAction('The predictor reading could not be deleted.', async () => {
          await this.actions.deletePredictorReading(confirmation.reading);
          if (!isCurrent()) return;
          this.closeConfirmation();
          this.actionStatus.set('Predictor reading deleted.');
        });
        break;
      case 'delete-many':
        await this.runAction('The selected predictor readings could not be deleted.', async () => {
          await this.actions.deletePredictorReadings(predictor.guid, confirmation.readings);
          if (!isCurrent()) return;
          this.closeConfirmation();
          this.actionStatus.set(`${confirmation.readings.length} predictor readings deleted.`);
        });
        break;
      case 'fill-missing':
        await this.runAction('Missing predictor months could not be filled.', async () => {
          const added = await this.actions.fillMissingPredictorMonths(predictor.guid, confirmation.months);
          if (!isCurrent()) return;
          this.closeConfirmation();
          this.actionStatus.set(`${added.length} missing month${added.length === 1 ? '' : 's'} filled.`);
        });
        break;
    }
  }

  showAttentionEntries(): void {
    this.table?.filter.set('attention');
    this.table?.currentPage.set(1);
  }

  private async runAction(errorMessage: string, action: () => Promise<void>): Promise<void> {
    if (!this.canAct()) return;
    const generation = this.actionGeneration;
    this.saving.set(true);
    this.actionError.set(undefined);
    this.actionStatus.set('');
    try {
      await action();
    } catch (error) {
      if (!this.destroy.destroyed && generation === this.actionGeneration) this.actionError.set(error instanceof Error ? error.message : errorMessage);
    } finally {
      if (!this.destroy.destroyed && generation === this.actionGeneration) this.saving.set(false);
    }
  }

  private closeEditor(force = false): void {
    if (!force && this.saving()) return;
    if (!this.editorPanel()) return;
    this.editorPanel.set(undefined);
    this.restoreFocus();
  }

  private canReplaceEditor(): boolean {
    if (this.saving()) return false;
    return !this.hasUnsavedChanges() || this.unsavedChanges.confirmDiscard();
  }

  private showConfirmationModal(): void {
    if (!this.readingsConfirmationModal) return;
    this.confirmationModalOpen = true;
    this.modalPortal.show(new TemplatePortal(this.readingsConfirmationModal, this.viewContainerRef));
  }

  private hideConfirmationModal(): void {
    if (!this.confirmationModalOpen) return;
    this.confirmationModalOpen = false;
    this.modalPortal.hide();
  }

  private closeConfirmation(): void {
    this.confirmation.set(undefined);
    this.hideConfirmationModal();
    this.restoreFocus();
  }

  private captureFocus(): void {
    this.returnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  }

  private restoreFocus(): void {
    afterNextRender(() => {
      const target = this.returnFocusTarget?.isConnected
        ? this.returnFocusTarget
        : this.readingsRegion?.nativeElement;
      if (target) this.focusMonitor.focusVia(target, 'program');
      this.returnFocusTarget = undefined;
    }, { injector: this.injector });
  }
}
