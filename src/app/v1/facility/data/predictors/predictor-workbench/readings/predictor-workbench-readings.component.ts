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
  untracked
} from '@angular/core';
import { HasUnsavedChanges } from '@app/v1/account/data/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import {
  PredictorReadingEditorMode,
  PredictorReadingSaveRequest,
  PredictorReadingsConfirmation,
  WeatherMaintenanceMode,
  WeatherMaintenancePreview,
  WeatherMaintenanceRequest,
  buildPredictorReadingTableView,
  createPredictorReading,
  findMissingPredictorMonths,
  weatherRangeForReadings
} from '../../models';
import { PredictorWorkspaceActionsService } from '../../predictor-workspace-actions.service';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { PredictorReadingEditorComponent } from './predictor-reading-editor/predictor-reading-editor.component';
import { PredictorReadingsConfirmationModalComponent } from './predictor-readings-confirmation-modal/predictor-readings-confirmation-modal.component';
import { PredictorReadingsTableComponent } from './predictor-readings-table/predictor-readings-table.component';
import { WeatherMaintenanceSlideoutComponent } from './weather-maintenance-slideout/weather-maintenance-slideout.component';

interface PredictorReadingPanelState {
  readonly mode: PredictorReadingEditorMode;
  readonly reading: IdbPredictorData;
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
    PredictorReadingsTableComponent,
    WeatherMaintenanceSlideoutComponent
  ]
})
export class PredictorWorkbenchReadingsComponent implements HasUnsavedChanges, OnDestroy {
  private readonly actions = inject(PredictorWorkspaceActionsService);
  readonly weatherWorkflow = inject(PredictorWeatherWorkflowService);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly injector = inject(Injector);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly status = inject(WorkspaceStatusService);

  readonly editorPanel = signal<PredictorReadingPanelState | undefined>(undefined);
  readonly confirmation = signal<PredictorReadingsConfirmation | undefined>(undefined);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly actionStatus = signal('');
  readonly weatherPanelMode = signal<WeatherMaintenanceMode | undefined>(undefined);
  readonly weatherPreview = signal<WeatherMaintenancePreview | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly tableView = computed(() => buildPredictorReadingTableView(
    this.workspace.selectedPredictor(),
    this.workspace.selectedReadings()
  ));
  readonly missingMonths = computed(() => findMissingPredictorMonths(this.workspace.selectedReadings()));
  readonly findings = computed(() => {
    const predictor = this.workspace.selectedPredictor();
    return predictor ? this.status.predictorFindings(predictor.guid) : [];
  });
  readonly weatherRange = computed(() => weatherRangeForReadings(this.workspace.selectedReadings())
    ?? this.workspace.defaultWeatherRange());

  private confirmationModalOpen = false;
  private returnFocusTarget?: HTMLElement;
  private readonly unregisterUnsavedChanges = this.unsavedChanges.register(
    () => this.hasUnsavedChanges(),
    () => this.closeEditor(true),
    () => this.isNavigationBlocked()
  );
  private readonly selectedPredictorGuid = computed(() => this.workspace.selectedPredictor()?.guid);
  private readonly resetOnPredictorChange = effect(() => {
    this.selectedPredictorGuid();
    untracked(() => {
      this.editorPanel.set(undefined);
      this.confirmation.set(undefined);
      this.closeWeatherPanel();
      this.hideConfirmationModal();
      this.actionError.set(undefined);
    });
  });

  @ViewChild(PredictorReadingEditorComponent) private readonly editor?: PredictorReadingEditorComponent;
  @ViewChild(PredictorReadingsTableComponent) private readonly table?: PredictorReadingsTableComponent;
  @ViewChild('readingsConfirmationModal') private readonly readingsConfirmationModal?: TemplateRef<unknown>;
  @ViewChild('readingsRegion', { read: ElementRef }) private readonly readingsRegion?: ElementRef<HTMLElement>;

  ngOnDestroy(): void {
    this.unregisterUnsavedChanges();
    this.hideConfirmationModal();
  }

  hasUnsavedChanges(): boolean {
    return !!this.editor?.form?.dirty;
  }

  isNavigationBlocked(): boolean {
    return this.saving();
  }

  openAddReading(): void {
    const predictor = this.workspace.selectedPredictor();
    if (!predictor || !this.canAct()) return;
    this.captureFocus();
    this.editorPanel.set({
      mode: 'add',
      reading: createPredictorReading(predictor, this.workspace.selectedReadings())
    });
    this.actionError.set(undefined);
  }

  openEditReading(reading: IdbPredictorData): void {
    if (!this.canAct()) return;
    this.captureFocus();
    this.editorPanel.set({ mode: 'edit', reading: structuredClone(reading) });
    this.actionError.set(undefined);
  }

  requestCloseEditor(): void {
    if (this.saving()) return;
    if (!this.hasUnsavedChanges()) {
      this.closeEditor();
      return;
    }
    this.unsavedChanges.confirmDiscard();
  }

  async saveReading(request: PredictorReadingSaveRequest): Promise<void> {
    const predictor = this.workspace.selectedPredictor();
    const panel = this.editorPanel();
    if (!predictor || !panel || !this.canAct()) return;
    if (this.workspace.selectedReadings().some(reading => reading.guid !== request.reading.guid
      && reading.year === request.reading.year && reading.month === request.reading.month)) {
      this.actionError.set('A reading already exists for this month.');
      return;
    }
    await this.runAction('The predictor reading could not be saved.', async () => {
      const saved = panel.mode === 'add'
        ? await this.actions.addPredictorReading(request.reading)
        : await this.actions.updatePredictorReading(request.reading);
      if (panel.mode === 'add' && request.addAnother) {
        const readings = [...this.workspace.selectedReadings().filter(reading => reading.guid !== saved.guid), saved];
        this.editorPanel.set({ mode: 'add', reading: createPredictorReading(predictor, readings) });
      } else {
        this.closeEditor(true);
      }
      this.actionStatus.set('Predictor reading saved.');
    });
  }

  requestDelete(reading: IdbPredictorData): void {
    if (!this.canAct()) return;
    this.captureFocus();
    this.actionError.set(undefined);
    this.confirmation.set({ kind: 'delete-one', reading });
    this.showConfirmationModal();
  }

  requestBulkDelete(readings: readonly IdbPredictorData[]): void {
    if (!this.canAct() || readings.length === 0) return;
    this.captureFocus();
    this.actionError.set(undefined);
    this.confirmation.set({ kind: 'delete-many', readings });
    this.showConfirmationModal();
  }

  requestFillMissing(): void {
    const months = this.missingMonths();
    if (!this.canAct() || months.length === 0) return;
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
    const predictor = this.workspace.selectedPredictor();
    if (!confirmation || !predictor) return;
    switch (confirmation.kind) {
      case 'delete-one':
        await this.runAction('The predictor reading could not be deleted.', async () => {
          await this.actions.deletePredictorReading(confirmation.reading);
          this.closeConfirmation();
          this.actionStatus.set('Predictor reading deleted.');
        });
        break;
      case 'delete-many':
        await this.runAction('The selected predictor readings could not be deleted.', async () => {
          await this.actions.deletePredictorReadings(predictor.guid, confirmation.readings);
          this.closeConfirmation();
          this.actionStatus.set(`${confirmation.readings.length} predictor readings deleted.`);
        });
        break;
      case 'fill-missing':
        await this.runAction('Missing predictor months could not be filled.', async () => {
          const added = await this.actions.fillMissingPredictorMonths(predictor.guid, confirmation.months);
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

  openWeatherMaintenance(): void {
    if (this.workspace.selectedPredictor()?.predictorType !== 'Weather' || !this.canAct()) return;
    this.captureFocus();
    this.weatherWorkflow.reset();
    this.weatherPreview.set(undefined);
    this.weatherPanelMode.set('maintenance');
  }

  async previewWeatherMaintenance(request: WeatherMaintenanceRequest): Promise<void> {
    const predictor = this.workspace.selectedPredictor();
    if (!predictor || predictor.predictorType !== 'Weather') return;
    const preview = await this.weatherWorkflow.previewMaintenance(predictor, this.workspace.selectedReadings(), request);
    this.weatherPreview.set(preview);
  }

  async requestRestoreCalculated(reading: IdbPredictorData): Promise<void> {
    const predictor = this.workspace.selectedPredictor();
    if (!predictor || predictor.predictorType !== 'Weather' || !this.canAct()) return;
    this.captureFocus();
    this.weatherWorkflow.reset();
    this.weatherPanelMode.set('restore');
    this.weatherPreview.set(undefined);
    this.weatherPreview.set(await this.weatherWorkflow.previewRestore(predictor, reading));
  }

  async applyWeatherPreview(): Promise<void> {
    const preview = this.weatherPreview();
    if (!preview || this.saving()) return;
    await this.runAction('Calculated weather readings could not be updated.', async () => {
      await this.weatherWorkflow.commitMaintenance(preview);
      this.closeWeatherPanel();
      this.actionStatus.set(preview.mode === 'restore' ? 'Calculated value restored.' : 'Weather readings updated.');
    });
  }

  closeWeatherPanel(): void {
    if (this.weatherWorkflow.busy()) this.weatherWorkflow.cancel();
    else this.weatherWorkflow.reset();
    this.weatherPanelMode.set(undefined);
    this.weatherPreview.set(undefined);
    this.restoreFocus();
  }

  private async runAction(errorMessage: string, action: () => Promise<void>): Promise<void> {
    if (!this.canAct()) return;
    this.saving.set(true);
    this.actionError.set(undefined);
    this.actionStatus.set('');
    try {
      await action();
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : errorMessage);
    } finally {
      this.saving.set(false);
    }
  }

  private closeEditor(force = false): void {
    if (!force && this.saving()) return;
    this.editorPanel.set(undefined);
    this.restoreFocus();
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
