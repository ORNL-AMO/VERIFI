import { TemplatePortal } from '@angular/cdk/portal';
import { Component, HostListener, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WeatherDataType } from '@data/models/idbModels/predictor';
import { HasUnsavedChanges } from '@app/v1/account/data/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../../predictor-workspace-actions.service';
import { PredictorSettingsSaveState, WEATHER_DATA_TYPE_OPTIONS } from '../../models';
import { WeatherMaintenancePreview } from '../../models';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { ConfirmDeletePredictorModalComponent } from '../../predictors-dashboard/predictor-browse-card/confirm-delete-predictor-modal/confirm-delete-predictor-modal.component';
import { PredictorSettingsForm, PredictorSettingsFormService } from './predictor-settings-form.service';
import { WeatherMaintenanceSlideoutComponent } from '../readings/weather-maintenance-slideout/weather-maintenance-slideout.component';

@Component({
  selector: 'app-predictor-workbench-settings', templateUrl: './predictor-workbench-settings.component.html',
  styleUrls: ['./predictor-workbench-settings.component.css'], standalone: true,
  imports: [ReactiveFormsModule, IconComponent, ConfirmDeletePredictorModalComponent,
    WeatherMaintenanceSlideoutComponent]
})
export class PredictorWorkbenchSettingsComponent implements HasUnsavedChanges, OnDestroy {
  private readonly formService = inject(PredictorSettingsFormService);
  private readonly actions = inject(PredictorWorkspaceActionsService);
  readonly weatherWorkflow = inject(PredictorWeatherWorkflowService);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);

  readonly form = signal<PredictorSettingsForm | undefined>(undefined);
  readonly saveState = signal<PredictorSettingsSaveState>('idle');
  readonly saveMessage = signal('Changes save automatically.');
  readonly deleting = signal(false);
  readonly deleteError = signal<string | undefined>(undefined);
  readonly weatherDefinitionDirty = signal(false);
  readonly weatherPreviewOpen = signal(false);
  readonly weatherPreview = signal<WeatherMaintenancePreview | undefined>(undefined);
  readonly weatherTypes = WEATHER_DATA_TYPE_OPTIONS;
  readonly hasReadings = computed(() => this.workspace.selectedReadings().length > 0);
  readonly supportedPredictor = computed(() => {
    const type = this.workspace.selectedPredictor()?.predictorType;
    return type === 'Standard' || type === 'Weather';
  });
  readonly canEdit = computed(() => this.workspace.canWrite() && !this.workspace.hasPending()
    && this.saveState() !== 'saving' && !this.deleting() && this.supportedPredictor());
  readonly canDelete = computed(() => !!this.workspace.selectedPredictor() && this.workspace.canWrite()
    && !this.workspace.hasPending() && this.saveState() !== 'saving' && !this.deleting());

  private currentPredictorGuid: string | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private deleteModalOpen = false;
  private readonly unregisterUnsavedChanges = this.unsavedChanges.register(
    () => this.hasUnsavedChanges(),
    () => this.discardChanges(),
    () => this.isNavigationBlocked()
  );
  @ViewChild('deletePredictorConfirmModal') private readonly deletePredictorConfirmModal?: TemplateRef<unknown>;

  private readonly rebuildEffect = effect(() => {
    const predictor = this.workspace.selectedPredictor();
    this.workspace.selectedReadings();
    if (!predictor || (predictor.predictorType !== 'Standard' && predictor.predictorType !== 'Weather')) {
      this.currentPredictorGuid = predictor?.guid;
      this.form.set(undefined);
      return;
    }
    if (predictor.guid !== this.currentPredictorGuid || !this.form()) {
      this.currentPredictorGuid = predictor.guid;
      this.saveState.set('idle');
      this.saveMessage.set('Changes save automatically.');
      this.weatherDefinitionDirty.set(false);
      this.weatherPreviewOpen.set(false);
      this.weatherPreview.set(undefined);
      this.form.set(this.formService.build(predictor));
    }
    untracked(() => this.applyEnabledState());
  });
  private readonly enabledEffect = effect(() => {
    this.canEdit(); this.hasReadings(); this.form();
    untracked(() => this.applyEnabledState());
  });

  ngOnDestroy(): void {
    this.clearDebounce();
    this.unregisterUnsavedChanges();
    this.hideDeleteModal();
    this.weatherWorkflow.reset();
  }

  hasUnsavedChanges(): boolean { return !!this.form()?.dirty; }
  isNavigationBlocked(): boolean { return this.saveState() === 'saving' || this.deleting(); }
  discardChanges(): void {
    const predictor = this.workspace.selectedPredictor();
    if (predictor && this.supportedPredictor()) this.form.set(this.formService.build(predictor));
    this.clearDebounce();
    this.weatherDefinitionDirty.set(false);
    this.weatherPreviewOpen.set(false);
    this.weatherPreview.set(undefined);
    this.weatherWorkflow.reset();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardSave(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void this.saveNow();
    }
  }

  onTextChange(): void { this.form()?.markAsDirty(); this.scheduleSave(); }
  onImmediateChange(): void {
    const form = this.form();
    form?.markAsDirty();
    form?.updateValueAndValidity();
    void this.saveNow();
  }
  toggleNoLongerInUse(): void {
    const form = this.form();
    if (!form || !this.canEdit()) return;
    form.controls.noLongerInUse.setValue(!form.controls.noLongerInUse.value);
    form.markAsDirty();
    void this.saveNow();
  }
  onWeatherDefinitionChange(): void {
    const form = this.form();
    form?.markAsDirty();
    form?.updateValueAndValidity();
    this.weatherDefinitionDirty.set(true);
    if (this.hasReadings()) {
      this.saveState.set('idle');
      this.saveMessage.set('Review recalculated readings to save these weather settings.');
      return;
    }
    void this.saveNow();
  }
  setWeatherDataType(value: string): void {
    const form = this.form();
    if (!form || !this.canEdit()) return;
    form.controls.weatherDataType.setValue(value as WeatherDataType);
    form.markAsDirty();
    form.updateValueAndValidity();
    this.onWeatherDefinitionChange();
  }

  async saveNow(): Promise<void> {
    this.clearDebounce();
    const form = this.form();
    const predictor = this.workspace.selectedPredictor();
    if (!form || !predictor || form.pristine || !this.workspace.canWrite() || this.saveState() === 'saving') return;
    form.updateValueAndValidity();
    if (form.invalid) {
      form.markAllAsTouched();
      this.saveState.set('invalid');
      this.saveMessage.set('Resolve validation issues before these settings can be saved.');
      return;
    }
    const updated = this.formService.updatePredictor(predictor, form);
    if (predictor.predictorType === 'Weather' && this.hasReadings() && this.weatherDefinitionDirty()) {
      await this.previewWeatherSettings(predictor, updated);
      return;
    }
    this.saveState.set('saving');
    this.saveMessage.set('Saving settings…');
    this.applyEnabledState();
    try {
      await this.actions.updatePredictor(updated);
      form.markAsPristine();
      this.weatherDefinitionDirty.set(false);
      this.saveState.set('saved');
      this.saveMessage.set('Saved.');
    } catch {
      this.saveState.set('error');
      this.saveMessage.set('Settings could not be saved. Try again.');
    } finally { this.applyEnabledState(); }
  }

  async previewWeatherSettings(currentPredictor = this.workspace.selectedPredictor(), proposedPredictor?: typeof currentPredictor): Promise<void> {
    const form = this.form();
    if (!form || !currentPredictor || currentPredictor.predictorType !== 'Weather') return;
    form.updateValueAndValidity();
    if (form.invalid) {
      form.markAllAsTouched();
      this.saveState.set('invalid');
      this.saveMessage.set('Resolve validation issues before recalculating readings.');
      return;
    }
    const proposed = proposedPredictor ?? this.formService.updatePredictor(currentPredictor, form);
    this.clearDebounce();
    this.weatherPreviewOpen.set(true);
    this.weatherPreview.set(undefined);
    this.saveState.set('saving');
    this.saveMessage.set('Preparing recalculated readings…');
    const preview = await this.weatherWorkflow.previewSettingsChange(currentPredictor, proposed, this.workspace.selectedReadings());
    this.weatherPreview.set(preview);
    this.saveState.set(preview ? 'idle' : 'error');
    this.saveMessage.set(preview ? 'Review the calculated changes before saving.' : 'Weather data could not be prepared. Try again.');
  }

  async confirmWeatherSettings(): Promise<void> {
    const preview = this.weatherPreview();
    const form = this.form();
    if (!preview || !form || this.saveState() === 'saving') return;
    this.saveState.set('saving');
    this.saveMessage.set('Saving settings and recalculated readings…');
    try {
      await this.weatherWorkflow.commitSettings(preview);
      form.markAsPristine();
      this.weatherDefinitionDirty.set(false);
      this.weatherPreviewOpen.set(false);
      this.weatherPreview.set(undefined);
      this.saveState.set('saved');
      this.saveMessage.set('Saved.');
    } catch {
      this.saveState.set('error');
      this.saveMessage.set('Settings and readings could not be saved. Try again.');
    }
  }

  closeWeatherPreview(): void {
    if (this.weatherWorkflow.busy()) this.weatherWorkflow.cancel();
    else this.weatherWorkflow.reset();
    this.weatherPreviewOpen.set(false);
    this.weatherPreview.set(undefined);
    if (this.form()?.dirty) {
      this.saveState.set('idle');
      this.saveMessage.set('Weather setting changes remain unsaved.');
    }
  }

  requestDeletePredictor(): void {
    const template = this.deletePredictorConfirmModal;
    if (!this.canDelete() || !template) return;
    this.deleteError.set(undefined);
    this.deleteModalOpen = true;
    this.modalPortal.show(new TemplatePortal(template, this.viewContainerRef));
  }
  cancelDeletePredictor(): void {
    if (!this.deleting()) { this.deleteError.set(undefined); this.hideDeleteModal(); }
  }
  async confirmDeletePredictor(): Promise<void> {
    const predictor = this.workspace.selectedPredictor();
    const facility = this.workspace.facility();
    if (!predictor || !facility || !this.canDelete()) return;
    this.deleting.set(true);
    this.clearDebounce();
    try {
      await this.actions.deletePredictor(predictor);
      this.form()?.markAsPristine();
      this.hideDeleteModal();
      await this.router.navigate(this.navigation.facilityDataRoute(facility.guid, 'predictors'));
    } catch (error) {
      this.deleteError.set(error instanceof Error ? error.message : 'The predictor could not be deleted.');
    } finally { this.deleting.set(false); }
  }

  private scheduleSave(): void {
    this.clearDebounce();
    this.saveState.set('idle');
    this.saveMessage.set('Changes save automatically.');
    this.debounceTimer = setTimeout(() => void this.saveNow(), 650);
  }
  private clearDebounce(): void {
    if (this.debounceTimer) { clearTimeout(this.debounceTimer); this.debounceTimer = undefined; }
  }
  private applyEnabledState(): void {
    const form = this.form();
    if (!form) return;
    if (!this.canEdit()) { form.disable({ emitEvent: false }); return; }
    form.enable({ emitEvent: false });
    form.controls.predictorType.disable({ emitEvent: false });
    if (this.hasReadings()) {
      form.controls.predictorType.disable({ emitEvent: false });
    }
  }
  private hideDeleteModal(): void {
    if (this.deleteModalOpen) { this.deleteModalOpen = false; this.modalPortal.hide(); }
  }
}
