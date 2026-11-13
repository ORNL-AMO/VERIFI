import { Component, DestroyRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { TemplatePortal } from '@angular/cdk/portal';
import { Params, Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, distinctUntilChanged, map } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import type { EnergyUseGroupSettings } from '@data/account-workspace/handlers/energy-use-command.models';
import { ConflictChoices, draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { EditSaveMode, SettingsHydrationMode, injectSettingsEditSession } from '@app/v1/data/editing/settings-edit-session';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { groupSettings, normalizeGroupSettings, reconcileGroupSettings } from '../../models/energy-use-group-settings.models';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';
import { EnergyUseWorkbenchHeaderService } from '../energy-use-workbench-header.service';

interface GroupDeletionReview {
  readonly key: string;
  readonly group: IdbFacilityEnergyUseGroup;
  readonly items: readonly IdbFacilityEnergyUseEquipment[];
  readonly destination: { readonly route: readonly string[]; readonly queryParams?: Params };
}

@Component({ selector: 'app-setup-group', standalone: false, templateUrl: './setup-group.component.html', styleUrls: ['./setup-group.component.css'] })
export class SetupGroupComponent {
  readonly context = inject(EnergyUseWorkbenchContextService);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly actions = inject(EnergyUseActionsService);
  private readonly modal = inject(ModalPortalService);
  private readonly header = inject(EnergyUseWorkbenchHeaderService);
  private readonly router = inject(Router);
  private readonly view = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private portal?: TemplatePortal;
  @ViewChild('deleteConfirmation') private readonly deleteConfirmation?: TemplateRef<unknown>;
  readonly deleting = signal(false);
  readonly deletionCommitted = signal(false);
  readonly deleted = signal(false);
  readonly deletionError = signal('');
  readonly deletionReview = signal<GroupDeletionReview | undefined>(undefined);
  readonly creation = this.header.creation;
  readonly identity = computed(() => ({ accountGuid: this.workspace.account()?.guid ?? '', facilityGuid: this.context.facilityGuid() ?? '', energyUseGroupGuid: this.context.energyUseGroupGuid() ?? '' }));
  readonly key = computed(() => { const id = this.identity(); return `${id.accountGuid}:${id.facilityGuid}:group:${id.energyUseGroupGuid}`; });
  readonly group = computed(() => this.workspace.energyUseGroups().find(group => group.guid === this.identity().energyUseGroupGuid
    && group.accountId === this.identity().accountGuid && group.facilityId === this.identity().facilityGuid));
  readonly saved = computed(() => { const group = this.group(); return group ? groupSettings(group) : undefined; });
  readonly members = computed(() => this.workspace.energyUseEquipment().filter(item => item.energyUseGroupId === this.identity().energyUseGroupGuid
    && item.accountId === this.identity().accountGuid && item.facilityId === this.identity().facilityGuid));
  readonly deletionStale = computed(() => {
    const review = this.deletionReview();
    const ordered = (items: readonly IdbFacilityEnergyUseEquipment[]) => [...items].sort((a, b) => a.guid.localeCompare(b.guid));
    return !!review && (review.key !== this.key() || !draftEqual(review.group, this.group()) || !draftEqual(ordered(review.items), ordered(this.members())));
  });
  readonly initialized = signal(false);
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, control => control.value.trim() ? null : { required: true }] }),
    notes: new FormControl('', { nonNullable: true })
  });
  private readonly changes = new Subject<EditSaveMode>();
  readonly editor = injectSettingsEditSession<EnergyUseGroupSettings>({
    key: this.key, saved: this.saved, canWrite: this.workspace.canWrite,
    pendingOwners: computed(() => this.workspace.pendingOperations().map(operation => operation.ownerId)), changes: this.changes,
    read: () => this.form.getRawValue(), normalize: normalizeGroupSettings, valid: () => this.form.valid,
    reconcile: reconcileGroupSettings, hydrate: (value, mode) => this.hydrate(value, mode),
    persist: (value, base, ownerId) => this.actions.updateGroupSettings(this.identity(), value, base, ownerId),
    setEnabled: enabled => enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false })
  });
  readonly message = computed(() => this.editor.state() === 'saving' ? 'Saving group settings…' : this.editor.state() === 'saved' ? 'Saved.' : this.editor.state() === 'error' ? this.editor.error() || 'Group settings could not be saved.'
    : this.editor.state() === 'conflict' ? 'Saved group settings changed. Review conflicting values before saving.'
    : this.editor.state() === 'invalid' ? 'Enter an energy-use group name.' : 'Changes save automatically.');
  readonly canManage = computed(() => !!this.context.group() && this.workspace.canWrite() && !this.workspace.hasPending()
    && !this.deleting() && !this.deletionCommitted() && !this.deleted() && !this.editor.dirty() && ['idle', 'saved'].includes(this.editor.state()));
  readonly canDelete = computed(() => !!this.group() && this.canManage());
  readonly blocked = computed(() => this.editor.saving() || this.deleting() || this.deletionCommitted());

  constructor() {
    const destroy = inject(DestroyRef);
    registerDataDraft(signal(false), () => {}, this.blocked);
    destroy.onDestroy(() => this.hideDeletion());
    destroy.onDestroy(this.header.register({ key: this.key, state: this.editor.state, dirty: this.editor.dirty,
      blocked: this.blocked, message: this.message, canRetry: computed(() => !!this.group() && this.workspace.canWrite() && !this.blocked()), retry: () => this.editor.retry() }));
    const sub = this.form.valueChanges.pipe(map(() => this.form.getRawValue()), distinctUntilChanged(draftEqual)).subscribe(() => this.changes.next('debounced'));
    destroy.onDestroy(() => sub.unsubscribe());
    effect(() => { const dirty = this.editor.dirty(); untracked(() => dirty ? this.form.markAsDirty() : this.form.markAsPristine()); });
    effect(() => {
      const review = this.deletionReview();
      if (review && review.key !== this.key()) untracked(() => this.hideDeletion());
    });
  }
  hasUnsavedChanges(): boolean { return this.editor.dirty(); }
  isNavigationBlocked(): boolean { return this.blocked() || this.workspace.hasPending() || this.modal.workspaceBlocked(); }
  resolveConflicts(choices: ConflictChoices): void { this.editor.resolveConflicts(choices); }
  requestDelete(): void {
    if (!this.canDelete() || !this.deleteConfirmation) return;
    this.deletionError.set('');
    this.deletionReview.set({ key: this.key(), group: structuredClone(this.group()!), items: structuredClone(this.members()), destination: this.context.inventoryLink() });
    this.portal = new TemplatePortal(this.deleteConfirmation, this.view);
    this.modal.show(this.portal, { blockWorkspace: true });
  }
  cancelDelete(): void { if (!this.deleting() && !this.deletionCommitted()) this.hideDeletion(); }
  private hideDeletion(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined; this.deletionReview.set(undefined);
  }
  async confirmDelete(): Promise<void> {
    const review = this.deletionReview(), identity = this.identity();
    if (!review || !this.canDelete() || this.deletionStale()) return;
    this.deleting.set(true); this.deletionError.set('');
    try {
      await this.actions.deleteGroup(identity, review.group, review.items);
      if (!this.destroy.destroyed && review.key === this.key()) await this.finishDeletion(review);
    } catch (error) {
      if (!this.destroy.destroyed && review.key === this.key()) {
        if (error instanceof WorkspaceWriteError && error.persistenceCommitted) {
          this.deletionCommitted.set(true);
          this.deletionError.set('The group was deleted, but the workspace could not refresh. Refresh saved changes to continue.');
        } else this.deletionError.set(error instanceof Error ? error.message : 'The group could not be deleted.');
      }
    } finally { if (!this.destroy.destroyed) this.deleting.set(false); }
  }
  async recoverDeletion(): Promise<void> {
    const review = this.deletionReview();
    if (!review || !this.deletionCommitted() || this.deleting() || review.key !== this.key()) return;
    this.deleting.set(true); this.deletionError.set('');
    try {
      await this.actions.recoverPublication(review.group.accountId);
      if (!this.destroy.destroyed && review.key === this.key()) await this.finishDeletion(review);
    } catch (error) {
      if (!this.destroy.destroyed && review.key === this.key()) this.deletionError.set(error instanceof Error ? error.message : 'Refresh failed. The deletion will not be repeated.');
    } finally { if (!this.destroy.destroyed) this.deleting.set(false); }
  }
  private async finishDeletion(review: GroupDeletionReview): Promise<void> {
    this.editor.discard(); this.deletionCommitted.set(false); this.deleted.set(true); this.deleting.set(false); this.hideDeletion();
    try {
      const opened = await this.router.navigate([...review.destination.route], { queryParams: review.destination.queryParams });
      if (!opened && !this.destroy.destroyed) this.deletionError.set('Group deleted. Use Back to energy uses to return to the dashboard.');
    } catch { if (!this.destroy.destroyed) this.deletionError.set('Group deleted. Use Back to energy uses to return to the dashboard.'); }
  }
  private hydrate(value: EnergyUseGroupSettings | undefined, mode: SettingsHydrationMode = 'reset'): void {
    if (!value) { this.form.reset({ name: '', notes: '' }, { emitEvent: false }); this.initialized.set(false); return; }
    const raw = this.form.getRawValue();
    this.form.setValue({
      name: mode === 'reconcile' && raw.name.trim() === value.name ? raw.name : value.name,
      notes: mode === 'reconcile' && raw.notes.trim() === value.notes ? raw.notes : value.notes
    }, { emitEvent: false });
    this.initialized.set(true);
  }
}
