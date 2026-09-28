import { TemplatePortal } from '@angular/cdk/portal';
import { Component, HostListener, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HasUnsavedChanges } from '@app/v1/account/data/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../../predictor-workspace-actions.service';
import { PredictorSettingsSaveState } from '../../models';
import { ConfirmDeletePredictorModalComponent } from '../../predictors-dashboard/predictor-browse-card/confirm-delete-predictor-modal/confirm-delete-predictor-modal.component';
import { PredictorSettingsForm, PredictorSettingsFormService } from './predictor-settings-form.service';
import { PredictorWorkbenchContextService } from '../predictor-workbench-context.service';

@Component({
  selector: 'app-predictor-workbench-settings', templateUrl: './predictor-workbench-settings.component.html',
  styleUrls: ['./predictor-workbench-settings.component.css'], standalone: true,
  imports: [ReactiveFormsModule, IconComponent, ConfirmDeletePredictorModalComponent]
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
  readonly context = inject(PredictorWorkbenchContextService);

  readonly form = signal<PredictorSettingsForm | undefined>(undefined);
  readonly saveState = signal<PredictorSettingsSaveState>('idle');
  readonly saveMessage = signal('Changes save automatically.');
  readonly deleting = signal(false);
  readonly deleteError = signal<string | undefined>(undefined);
  readonly hasReadings = computed(() => this.context.readings().length > 0);
  readonly supportedPredictor = computed(() => this.context.predictor()?.predictorType === 'Standard');
  readonly canEdit = computed(() => this.workspace.canWrite() && !this.workspace.hasPending()
    && this.saveState() !== 'saving' && !this.deleting() && this.supportedPredictor());
  readonly canDelete = computed(() => !!this.context.predictor() && this.workspace.canWrite()
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
    const predictor = this.context.predictor();
    this.context.readings();
    if (!predictor || predictor.predictorType !== 'Standard') {
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
    const predictor = this.context.predictor();
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
  toggleNoLongerInUse(): void {
    const form = this.form();
    if (!form || !this.canEdit()) return;
    form.controls.noLongerInUse.setValue(!form.controls.noLongerInUse.value);
    form.markAsDirty();
    void this.saveNow();
  }
  async saveNow(): Promise<void> {
    this.clearDebounce();
    const form = this.form();
    const predictor = this.context.predictor();
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
    const predictor = this.context.predictor();
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
