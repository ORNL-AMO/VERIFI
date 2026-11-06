import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, distinctUntilChanged, map } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { EnergyUseGroupSettings } from '@data/account-workspace/handlers/energy-use-command.models';
import { ConflictChoices, draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { EditSaveMode, SettingsHydrationMode, injectSettingsEditSession } from '@app/v1/data/editing/settings-edit-session';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { groupSettings, normalizeGroupSettings, reconcileGroupSettings } from '../../models/energy-use-group-settings.models';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';
import { EnergyUseWorkbenchHeaderService } from '../energy-use-workbench-header.service';

@Component({ selector: 'app-setup-group', standalone: false, templateUrl: './setup-group.component.html', styleUrls: ['./setup-group.component.css'] })
export class SetupGroupComponent {
  readonly context = inject(EnergyUseWorkbenchContextService);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly actions = inject(EnergyUseActionsService);
  private readonly modal = inject(ModalPortalService);
  private readonly header = inject(EnergyUseWorkbenchHeaderService);
  readonly creation = this.header.creation;
  readonly identity = computed(() => ({ accountGuid: this.workspace.account()?.guid ?? '', facilityGuid: this.context.facilityGuid() ?? '', energyUseGroupGuid: this.context.energyUseGroupGuid() ?? '' }));
  readonly key = computed(() => { const id = this.identity(); return `${id.accountGuid}:${id.facilityGuid}:group:${id.energyUseGroupGuid}`; });
  readonly group = computed(() => this.workspace.energyUseGroups().find(group => group.guid === this.identity().energyUseGroupGuid
    && group.accountId === this.identity().accountGuid && group.facilityId === this.identity().facilityGuid));
  readonly saved = computed(() => { const group = this.group(); return group ? groupSettings(group) : undefined; });
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
  readonly message = computed(() => this.editor.state() === 'error' ? this.editor.error() || 'Group settings could not be saved.'
    : this.editor.state() === 'conflict' ? 'Saved group settings changed. Review conflicting values before saving.'
    : this.editor.state() === 'invalid' ? 'Enter an energy-use group name.' : 'Changes save automatically.');
  readonly canManage = computed(() => !!this.context.group() && this.workspace.canWrite() && !this.workspace.hasPending()
    && !this.editor.dirty() && ['idle', 'saved'].includes(this.editor.state()));

  constructor() {
    const destroy = inject(DestroyRef);
    destroy.onDestroy(this.header.register({ key: this.key, state: this.editor.state, dirty: this.editor.dirty,
      blocked: this.editor.saving, message: this.message, canRetry: computed(() => !!this.group() && this.workspace.canWrite() && !this.editor.saving()), retry: () => this.editor.retry() }));
    const sub = this.form.valueChanges.pipe(map(() => this.form.getRawValue()), distinctUntilChanged(draftEqual)).subscribe(() => this.changes.next('debounced'));
    destroy.onDestroy(() => sub.unsubscribe());
    effect(() => { const dirty = this.editor.dirty(); untracked(() => dirty ? this.form.markAsDirty() : this.form.markAsPristine()); });
  }
  hasUnsavedChanges(): boolean { return this.editor.dirty(); }
  isNavigationBlocked(): boolean { return this.editor.saving() || this.workspace.hasPending() || this.modal.workspaceBlocked(); }
  resolveConflicts(choices: ConflictChoices): void { this.editor.resolveConflicts(choices); }
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
