import { TemplatePortal } from '@angular/cdk/portal';
import { Component, HostListener, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WeatherStation } from '@data/models/degreeDays';
import { WeatherDataType } from '@data/models/idbModels/predictor';
import { getWeatherSearchFromFacility } from '@shared/sharedHelperFunctions';
import { HasUnsavedChanges } from '@app/v1/account/data/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../../predictor-workspace-actions.service';
import { PredictorSettingsSaveState, WEATHER_DATA_TYPE_OPTIONS } from '../../models';
import { WeatherStationSelectorComponent } from '../../shared/weather-station-selector/weather-station-selector.component';
import { ConfirmDeletePredictorModalComponent } from '../../predictors-dashboard/predictor-browse-card/confirm-delete-predictor-modal/confirm-delete-predictor-modal.component';
import { PredictorSettingsForm, PredictorSettingsFormService } from './predictor-settings-form.service';

@Component({
  selector: 'app-predictor-workbench-settings', templateUrl: './predictor-workbench-settings.component.html',
  styleUrls: ['./predictor-workbench-settings.component.css'], standalone: true,
  imports: [ReactiveFormsModule, IconComponent, WeatherStationSelectorComponent, ConfirmDeletePredictorModalComponent]
})
export class PredictorWorkbenchSettingsComponent implements HasUnsavedChanges, OnDestroy {
  private readonly formService = inject(PredictorSettingsFormService);
  private readonly actions = inject(PredictorWorkspaceActionsService);
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
  readonly initialStationSearch = computed(() => {
    const facility = this.workspace.facility();
    return facility ? getWeatherSearchFromFacility(facility) : '';
  });

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
  }

  hasUnsavedChanges(): boolean { return !!this.form()?.dirty; }
  isNavigationBlocked(): boolean { return this.saveState() === 'saving' || this.deleting(); }
  discardChanges(): void {
    const predictor = this.workspace.selectedPredictor();
    if (predictor && this.supportedPredictor()) this.form.set(this.formService.build(predictor));
    this.clearDebounce();
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
  selectStation(station: WeatherStation): void {
    const form = this.form();
    if (!form || !this.canEdit() || this.hasReadings()) return;
    form.controls.weatherStationId.setValue(station.ID);
    form.controls.weatherStationName.setValue(station.name);
    form.markAsDirty();
    form.updateValueAndValidity();
    void this.saveNow();
  }
  setWeatherDataType(value: string): void {
    const form = this.form();
    if (!form || this.hasReadings()) return;
    form.controls.weatherDataType.setValue(value as WeatherDataType);
    form.markAsDirty();
    form.updateValueAndValidity();
    void this.saveNow();
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
    this.saveState.set('saving');
    this.saveMessage.set('Saving settings…');
    this.applyEnabledState();
    try {
      await this.actions.updatePredictor(updated);
      form.markAsPristine();
      this.saveState.set('saved');
      this.saveMessage.set('Saved.');
    } catch {
      this.saveState.set('error');
      this.saveMessage.set('Settings could not be saved. Try again.');
    } finally { this.applyEnabledState(); }
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
    if (this.hasReadings()) {
      ['predictorType', 'weatherDataType', 'weatherStationId', 'weatherStationName', 'heatingBaseTemperature', 'coolingBaseTemperature']
        .forEach(name => form.get(name)?.disable({ emitEvent: false }));
    }
  }
  private hideDeleteModal(): void {
    if (this.deleteModalOpen) { this.deleteModalOpen = false; this.modalPortal.hide(); }
  }
}
