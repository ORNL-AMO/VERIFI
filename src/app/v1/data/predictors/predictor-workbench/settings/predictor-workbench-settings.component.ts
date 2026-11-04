import { isStandardPredictor } from '@data/models/idbModels/predictor';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, HostListener, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Subscription, Subject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { HasUnsavedChanges } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { PredictorSettingsFormComponent } from '@app/v1/shared/predictor-settings/predictor-settings-form.component';
import { PredictorSettingsForm, PredictorSettingsFormService } from '@app/v1/shared/predictor-settings/predictor-settings-form.service';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { StandardPredictorActionsService } from '../../standard-predictor-actions.service';
import { ConflictChoices, draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { EditSaveMode, injectSettingsEditSession, SettingsHydrationMode } from '@app/v1/data/editing/settings-edit-session';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { normalizeStandardPredictorSettings, reconcileStandardPredictorSettings, StandardPredictorSettings,
  standardPredictorSettings, validStandardPredictorSettings } from '../../models/standard-predictor-settings.models';
import { ConfirmDeletePredictorModalComponent } from './confirm-delete-predictor-modal/confirm-delete-predictor-modal.component';
import { PredictorWorkbenchContextService } from '../predictor-workbench-context.service';

@Component({
  selector: 'app-predictor-workbench-settings', templateUrl: './predictor-workbench-settings.component.html',
  styleUrls: ['./predictor-workbench-settings.component.css'], standalone: true,
  imports: [ReactiveFormsModule, IconComponent, PredictorSettingsFormComponent, ConfirmDeletePredictorModalComponent,
    EditorConflictReviewComponent]
})
export class PredictorWorkbenchSettingsComponent implements HasUnsavedChanges, OnDestroy {
  private readonly formService = inject(PredictorSettingsFormService);
  private readonly actions = inject(StandardPredictorActionsService);
  private readonly accountWorkspace = inject(AccountWorkspaceStore);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly navigation = inject(WorkspaceNavigationService);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly context = inject(PredictorWorkbenchContextService);

  readonly form = signal<PredictorSettingsForm | undefined>(undefined);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | undefined>(undefined);
  readonly supportedPredictor = computed(() => { const predictor = this.context.predictor(); return !!predictor && isStandardPredictor(predictor); });
  private readonly editChanges = new Subject<EditSaveMode>();
  private formChanges?: Subscription;
  private lastFormValue?: StandardPredictorSettings;
  private readonly identity = computed(() => ({ accountGuid: this.workspace.account()?.guid ?? '',
    facilityGuid: this.workspace.facility()?.guid ?? '', predictorGuid: this.context.predictorGuid() ?? '' }));
  private readonly key = computed(() => {
    const identity = this.identity();
    return identity.accountGuid && identity.facilityGuid && identity.predictorGuid
      ? `${identity.accountGuid}:${identity.facilityGuid}:${identity.predictorGuid}` : '';
  });
  private readonly savedSettings = computed(() => {
    const predictor = this.context.predictor();
    return predictor && isStandardPredictor(predictor) ? standardPredictorSettings(predictor) : undefined;
  });
  readonly editor = injectSettingsEditSession<StandardPredictorSettings>({
    key: this.key, saved: this.savedSettings,
    canWrite: computed(() => this.workspace.canWrite() && !this.deleting() && this.supportedPredictor()),
    pendingOwners: computed(() => {
      const owners = this.accountWorkspace.pendingOperations().map(operation => operation.ownerId);
      return this.workspace.hasPending() && !owners.length ? [undefined] : owners;
    }),
    changes: this.editChanges,
    read: () => this.form()!.getRawValue(),
    normalize: normalizeStandardPredictorSettings,
    valid: validStandardPredictorSettings,
    reconcile: reconcileStandardPredictorSettings,
    hydrate: (value, mode) => this.hydrate(value, mode),
    persist: (value, base, ownerId) => this.actions.updateSettings(this.identity(), value, base, ownerId),
    setEnabled: enabled => {
      const form = this.form();
      if (form) enabled ? form.enable({ emitEvent: false }) : form.disable({ emitEvent: false });
    }
  });
  readonly saveState = this.editor.state;
  readonly saveMessage = computed(() => {
    switch (this.saveState()) {
      case 'saving': return 'Saving settings…';
      case 'saved': return 'Saved.';
      case 'invalid': return 'Resolve validation issues before these settings can be saved.';
      case 'error': return this.editor.error() || 'Settings could not be saved. Try again.';
      case 'conflict': return 'Saved settings changed. Review the conflicting values before saving.';
      default: return 'Changes save automatically.';
    }
  });
  readonly canEdit = this.editor.canEdit;
  readonly canDelete = computed(() => !!this.context.predictor() && this.workspace.canWrite()
    && !this.workspace.hasPending() && !this.editor.saving() && !this.deleting());
  private deleteModalOpen = false;
  @ViewChild('deletePredictorConfirmModal') private readonly deletePredictorConfirmModal?: TemplateRef<unknown>;

  private readonly pristineEffect = effect(() => {
    const dirty = this.editor.dirty();
    const form = this.form();
    if (form) untracked(() => dirty ? form.markAsDirty() : form.markAsPristine());
  });

  constructor() {
    registerDataDraft(signal(false), () => {},
      computed(() => this.deleting() || (this.workspace.hasPending() && !this.editor.saving())));
  }

  ngOnDestroy(): void {
    this.formChanges?.unsubscribe();
    this.hideDeleteModal();
  }

  hasUnsavedChanges(): boolean { return this.editor.dirty(); }
  isNavigationBlocked(): boolean { return this.editor.saving() || this.deleting() || this.workspace.hasPending(); }
  discardChanges(): void { this.editor.discard(); }
  resolveConflicts(choices: ConflictChoices): void { this.editor.resolveConflicts(choices); }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardSave(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void this.saveNow();
    }
  }

  toggleNoLongerInUse(): void {
    const form = this.form();
    if (!form || !this.canEdit()) return;
    form.controls.noLongerInUse.setValue(!form.controls.noLongerInUse.value);
  }
  async saveNow(): Promise<boolean> {
    this.form()?.markAllAsTouched();
    return this.editor.saveNow();
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
    try {
      await this.actions.deletePredictor(predictor);
      this.editor.discard();
      this.hideDeleteModal();
      this.deleting.set(false);
      await this.navigation.openFacilityInventory(facility.guid, 'predictors');
    } catch (error) {
      this.deleteError.set(error instanceof Error ? error.message : 'The predictor could not be deleted.');
    } finally { this.deleting.set(false); }
  }

  private hydrate(value: StandardPredictorSettings | undefined, mode: SettingsHydrationMode = 'reset'): void {
    if (!value) {
      this.formChanges?.unsubscribe();
      this.form.set(undefined);
      this.lastFormValue = undefined;
      return;
    }
    let form = this.form();
    if (!form) {
      const predictor = this.context.predictor();
      if (!predictor) return;
      form = this.formService.build(predictor);
      this.form.set(form);
      this.formChanges = form.valueChanges.subscribe(() => {
        const next = form!.getRawValue();
        const previous = this.lastFormValue;
        this.lastFormValue = next;
        if (JSON.stringify(next) === JSON.stringify(previous)) return;
        const immediate = !previous || (['production', 'noLongerInUse', 'stopMonth', 'canBeNegative',
          'ignoreDateStatusChecks'] as const).some(key => next[key] !== previous[key]);
        this.editChanges.next(immediate ? 'immediate' : 'debounced');
      });
    }
    this.formService.hydrate(form, value, mode);
    this.lastFormValue = form.getRawValue();
    if (draftEqual(normalizeStandardPredictorSettings(this.lastFormValue), this.savedSettings())) form.markAsPristine();
    else form.markAsDirty();
  }
  private hideDeleteModal(): void {
    if (this.deleteModalOpen) { this.deleteModalOpen = false; this.modalPortal.hide(); }
  }
}
