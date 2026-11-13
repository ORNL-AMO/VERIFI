import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import type { UpdateVisualizationCommand } from '@data/account-workspace/visualization-commands.models';
import type { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { SAVED_VISUALIZATION_RECORD_VERSION } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization, savedVisualizationEnvelopeError } from '@data/visualizations/saved-visualization-record';
import type { VisualizationDefinition, VisualizationFacilitySelection } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { sameVisualizationFacilitySelection } from '@domain/visualizations/visualization-facilities';
import { prepareVisualizationFacilityChange } from '@domain/visualizations/visualization-facility-change';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { normalizeVisualizationIntent, reconcileVisualizationIntent, visualizationIntentEqual,
  VisualizationConflictChoices, VisualizationEditConflict } from './visualization-reconciliation';

export const VISUALIZATION_AUTOSAVE_DEBOUNCE_MS = 650;
export type VisualizationEditorState = 'saved' | 'dirty' | 'saving' | 'invalid' | 'error' | 'conflict'
  | 'refresh-required' | 'missing' | 'readonly';

/** Route-owned metadata and definition editing. The workbench owns confirmation presentation. */
@Injectable()
export class VisualizationEditorSession {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commands = inject(SavedVisualizationCommands);
  private readonly destroy = inject(DestroyRef);
  private readonly navigation = inject(UnsavedChangesService);
  private readonly accountGuidValue = signal('');
  private readonly guidValue = signal('');
  private readonly recordValue = signal<Readonly<IdbSavedVisualization> | undefined>(undefined);
  private readonly draft = signal<VisualizationDefinition | undefined>(undefined);
  private readonly stateValue = signal<VisualizationEditorState>('missing');
  private readonly errorValue = signal<string | undefined>(undefined);
  private readonly conflictsValue = signal<readonly VisualizationEditConflict[]>([]);
  private readonly dirtyValue = signal(false);
  private readonly savingValue = signal(false);
  private readonly missingValue = signal(true);
  private readonly editableValue = signal(false);
  private readonly localRevisionValue = signal(0);
  private baseline?: VisualizationDefinition;
  private latest?: VisualizationDefinition;
  private repair?: UpdateVisualizationCommand['repair'];
  private unverified?: { readonly submitted: VisualizationDefinition; readonly repair?: UpdateVisualizationCommand['repair']; readonly retarget?: boolean };
  private readonly pendingRetarget = signal<{ readonly selection: VisualizationFacilitySelection; readonly revision: number; readonly submitted: VisualizationDefinition } | undefined>(undefined);
  private authorityPublication?: unknown;
  private authorityPinned = false;
  private timer?: ReturnType<typeof setTimeout>;
  private dueAt?: number;
  private running?: Promise<boolean>;
  private recovering?: Promise<boolean>;
  private generation = 0;
  private disposed = false;

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    title: new FormControl('', { nonNullable: true }),
    legend: new FormControl(true, { nonNullable: true })
  });
  readonly definition = computed(() => this.draft() ? normalizeVisualizationIntent(this.draft()!) : undefined);
  readonly state = this.stateValue.asReadonly();
  readonly dirty = this.dirtyValue.asReadonly();
  readonly saving = this.savingValue.asReadonly();
  readonly error = this.errorValue.asReadonly();
  readonly conflicts = this.conflictsValue.asReadonly();
  readonly localRevision = this.localRevisionValue.asReadonly();
  readonly record = this.recordValue.asReadonly();
  readonly isMissing = this.missingValue.asReadonly();
  readonly key = computed(() => this.accountGuidValue() && this.guidValue()
    ? JSON.stringify([this.accountGuidValue(), this.guidValue()]) : '');
  readonly savedRevision = computed(() => this.record()?.revision ?? 0);
  readonly needsProtection = computed(() => this.dirty() || this.saving() || this.state() === 'refresh-required');
  readonly canEdit = computed(() => this.editableValue() && !this.pendingRetarget() && this.workspace.isReady()
    && this.workspace.account()?.guid === this.accountGuidValue());
  /** Readable transferred intent can repair its facility boundary without enabling ordinary edits. */
  readonly canRetarget = computed(() => {
    const record = this.record();
    if (!record || record.recordVersion !== SAVED_VISUALIZATION_RECORD_VERSION || record.preservation?.locked
      || savedVisualizationEnvelopeError(record)) return false;
    const payload = decodeVisualizationDefinition(record.definition);
    return 'definition' in payload && (!this.pendingRetarget() || this.saving()) && this.workspace.isReady()
      && this.workspace.account()?.guid === this.accountGuidValue();
  });

  constructor() {
    const subscription = this.form.valueChanges.subscribe(() => this.changed());
    const unregister = this.navigation.register(() => this.needsProtection(), () => this.discard(),
      () => this.saving() || this.state() === 'refresh-required');
    const unprotect = this.navigation.protectBeforeUnload(this.needsProtection);
    effect(() => {
      const accountGuid = this.accountGuidValue(), guid = this.guidValue();
      const ready = this.workspace.isReady(), account = this.workspace.account();
      const records = this.workspace.savedVisualizations();
      this.workspace.hasPending();
      this.workspace.snapshot();
      untracked(() => {
        if (ready && account?.guid === accountGuid && guid) this.hydrate(records.find(record => record.guid === guid && record.accountId === accountGuid));
        this.setEnabled(); this.schedule();
      });
    });
    this.destroy.onDestroy(() => {
      this.disposed = true; ++this.generation; this.clearTimer(); subscription.unsubscribe(); unregister(); unprotect();
    });
  }

  open(accountGuid: string, guid: string): void {
    if (accountGuid === this.accountGuidValue() && guid === this.guidValue()) return;
    if (this.needsProtection()) return;
    this.clearTimer(); ++this.generation;
    this.accountGuidValue.set(accountGuid); this.guidValue.set(guid);
    this.recordValue.set(undefined); this.draft.set(undefined); this.baseline = undefined; this.latest = undefined;
    this.repair = undefined; this.unverified = undefined; this.pendingRetarget.set(undefined); this.authorityPinned = false;
    this.errorValue.set(undefined); this.conflictsValue.set([]); this.dirtyValue.set(false);
    this.savingValue.set(false); this.missingValue.set(true); this.editableValue.set(false);
    this.localRevisionValue.update(value => value + 1); this.stateValue.set('missing');
    const record = this.workspace.isReady() && this.workspace.account()?.guid === accountGuid
      ? this.workspace.savedVisualizations().find(item => item.accountId === accountGuid && item.guid === guid) : undefined;
    this.hydrate(record);
  }

  /** Only committed publications are hydrated; failed-command snapshots remain authoritative until a new publication. */
  hydrate(record: Readonly<IdbSavedVisualization> | undefined): void {
    if (this.disposed || this.saving() || this.unverified || this.pendingRetarget()) return;
    if (this.authorityPinned && this.authorityPublication === this.workspace.snapshot()) return;
    this.authorityPinned = false;
    if (record && (record.accountId !== this.accountGuidValue() || record.guid !== this.guidValue())) return;
    if (record && this.record() && record.revision < this.record()!.revision) return;
    if (record && this.record() && record.revision === this.record()!.revision) return;
    this.acceptRecord(record);
  }

  applyDefinition(definition: VisualizationDefinition, repair?: UpdateVisualizationCommand['repair']): void {
    if (this.disposed || !this.record() || this.unverified || !this.workspace.isReady()
      || this.workspace.account()?.guid !== this.accountGuidValue()) return;
    const owner = this.record()!;
    if (definition.accountGuid !== owner.accountId || this.latest
      && !sameVisualizationFacilitySelection(definition.facilitySelection, this.latest.facilitySelection)) return;
    const validation = decodeVisualizationDefinition(definition);
    if (validation.state !== 'valid' && validation.state !== 'setup-required') return;
    if (!this.editableValue() && !repair) return;
    this.repair = repair; this.editableValue.set(true);
    this.writeDraft(structuredClone(definition), false); this.changed(); this.setEnabled();
  }

  resolveConflicts(choices: VisualizationConflictChoices): void {
    if (!this.baseline || !this.latest || !this.draft() || this.saving() || this.unverified) return;
    if (choices.configuration === 'local' && !sameVisualizationFacilitySelection(this.draft()!.facilitySelection, this.latest.facilitySelection)) {
      this.errorValue.set('Facility inclusion changed in another session. Use the saved configuration to resolve this conflict, then review any facility changes separately. Your local configuration is retained until you decide.');
      return;
    }
    const merged = reconcileVisualizationIntent(this.baseline, normalizeVisualizationIntent(this.draft()!), this.latest, choices);
    this.baseline = merged.baseline; this.conflictsValue.set(merged.conflicts);
    this.writeDraft(merged.value, true); this.refreshDirty();
    this.errorValue.set(undefined); this.dueAt = Date.now() + VISUALIZATION_AUTOSAVE_DEBOUNCE_MS;
    this.updateState(); this.schedule();
  }

  async flush(): Promise<boolean> {
    this.clearTimer();
    if (this.running) await this.running;
    if (this.disposed) return false;
    if (this.unverified) {
      if (!await this.recover()) return false;
    }
    if (this.pendingRetarget()) return this.state() === 'error' ? false : this.saveRetarget();
    while (this.dirty()) {
      if (!this.saveable() || this.state() === 'error') return false;
      if (!await this.saveOnce()) return false;
      this.clearTimer();
    }
    return !this.saving() && !this.unverified;
  }

  /** Only a reviewed Facilities action changes inclusion; ordinary autosave keeps its saved boundary. */
  async retarget(selection: VisualizationFacilitySelection, reviewedDefinition: VisualizationDefinition): Promise<boolean> {
    if (!this.canRetarget() || this.isMissing() || this.pendingRetarget() || !this.definition()) return false;
    if (sameVisualizationFacilitySelection(this.definition()!.facilitySelection, selection)) return true;
    const generation = this.generation, revision = this.localRevision();
    if (!await this.flush() || this.disposed || generation !== this.generation) return false;
    if (!this.canRetarget() || this.isMissing() || this.pendingRetarget()) return false;
    if (revision !== this.localRevision()) {
      this.errorValue.set('The visualization changed while saving. Review the facility change again.');
      return false;
    }
    const snapshot = this.workspace.snapshot();
    if (!snapshot) return false;
    const submitted = normalizeVisualizationIntent(prepareVisualizationFacilityChange(this.definition()!, selection, snapshot, this.record()?.preservation?.references).definition);
    if (!visualizationIntentEqual(submitted, normalizeVisualizationIntent(reviewedDefinition))) {
      this.errorValue.set('Facilities or source membership changed during review. Review the facility change again.'); return false;
    }
    this.pendingRetarget.set({ selection: structuredClone(selection), revision: this.savedRevision(), submitted });
    this.refreshDirty(); this.updateState(); this.setEnabled();
    return this.saveRetarget();
  }

  async retry(): Promise<boolean> {
    if (this.unverified && !await this.recover()) return false;
    if (this.isMissing() || this.conflicts().length) return false;
    this.errorValue.set(undefined); this.updateState();
    return this.flush();
  }

  discard(): void {
    if (this.saving() || this.unverified) return;
    this.clearTimer(); this.repair = undefined; this.pendingRetarget.set(undefined); this.conflictsValue.set([]); this.errorValue.set(undefined);
    this.baseline = this.latest ? structuredClone(this.latest) : undefined;
    this.writeDraft(this.isMissing() ? undefined : this.latest, false);
    this.dirtyValue.set(false); this.stateValue.set(this.isMissing() ? 'missing' : this.editableValue() ? 'saved' : 'readonly');
    this.setEnabled();
  }

  private changed(): void {
    if (!this.canEdit() || !this.draft()) return;
    const values = this.form.getRawValue();
    this.draft.set({ ...this.draft()!, name: values.name, appearance: {
      legend: values.legend, ...(values.title ? { title: values.title } : {})
    } });
    this.localRevisionValue.update(value => value + 1); this.clearTimer();
    this.dueAt = Date.now() + VISUALIZATION_AUTOSAVE_DEBOUNCE_MS;
    if (!this.unverified) this.errorValue.set(undefined);
    if (this.conflicts().length && this.baseline && this.latest) {
      const merged = reconcileVisualizationIntent(this.baseline, normalizeVisualizationIntent(this.draft()!), this.latest);
      this.baseline = merged.baseline; this.conflictsValue.set(merged.conflicts); this.writeDraft(merged.value, true);
    }
    this.refreshDirty(); this.updateState(); this.schedule();
  }

  private acceptRecord(record: Readonly<IdbSavedVisualization> | undefined, submitted?: VisualizationDefinition): void {
    this.recordValue.set(record ? structuredClone(record) : undefined); this.missingValue.set(!record);
    if (!record) {
      this.clearTimer(); this.latest = undefined; this.errorValue.set('This visualization was deleted or is unavailable. Save your local intent as a new visualization, or discard it.');
      this.refreshDirty(); this.stateValue.set('missing'); return;
    }
    const decoded = readSavedVisualization(record);
    let definition: VisualizationDefinition | undefined;
    const editable = decoded.state === 'valid' || decoded.state === 'setup-required';
    if (editable) definition = decoded.definition;
    else if (decoded.state === 'repair-required' && record.recordVersion === SAVED_VISUALIZATION_RECORD_VERSION
      && !savedVisualizationEnvelopeError(record)) {
      const payload = decodeVisualizationDefinition(record.definition);
      if (payload.state === 'valid' || payload.state === 'setup-required') definition = payload.definition;
    }
    this.editableValue.set(editable);
    if (!definition) {
      this.clearTimer(); this.latest = undefined;
      // A protected draft remains available when a readable saved record becomes unsupported externally.
      if (!this.dirty()) { this.baseline = undefined; this.writeDraft(undefined, false); }
      this.errorValue.set(decoded.issues.map(issue => issue.message).join(' ')); this.stateValue.set('readonly'); this.setEnabled(); return;
    }
    const next = normalizeVisualizationIntent(definition);
    this.latest = structuredClone(next);
    if (!this.baseline || !this.draft()) {
      this.baseline = structuredClone(next); this.writeDraft(definition, false); this.conflictsValue.set([]);
    } else {
      const merged = reconcileVisualizationIntent(submitted ?? this.baseline, normalizeVisualizationIntent(this.draft()!), next);
      this.baseline = merged.baseline; this.conflictsValue.set(merged.conflicts); this.writeDraft(merged.value, true);
    }
    this.refreshDirty(); this.updateState(); this.setEnabled(); this.schedule();
  }

  private saveOnce(): Promise<boolean> {
    if (this.running) return this.running;
    if (!this.saveable()) return Promise.resolve(false);
    const generation = this.generation;
    const submitted = normalizeVisualizationIntent(this.draft()!);
    const submittedRepair = this.repair;
    const command: UpdateVisualizationCommand = { kind: 'update', accountGuid: this.accountGuidValue(), guid: this.guidValue(),
      expectedRevision: this.savedRevision(), definition: submitted, ...(submittedRepair ? { repair: submittedRepair } : {}) };
    this.savingValue.set(true); this.stateValue.set('saving'); this.errorValue.set(undefined);
    const operation = this.commands.submit(command).then(outcome => {
      if (this.disposed || generation !== this.generation) return false;
      if (outcome.state === 'committed') {
        if (visualizationIntentEqual(this.repair, submittedRepair)) this.repair = undefined;
        this.acceptRecord(outcome.value, submitted); return !this.conflicts().length;
      }
      this.pinAuthority();
      if (outcome.state === 'refresh-required') {
        this.unverified = { submitted, repair: submittedRepair }; this.dirtyValue.set(true);
        this.errorValue.set('Your changes were saved, but the workspace could not refresh. Retry to recover the committed save.');
        this.stateValue.set('refresh-required'); return false;
      }
      if (outcome.state === 'conflict') {
        this.acceptRecord(outcome.current);
        if (!this.isMissing() && !this.conflicts().length) {
          // A revision changed without conflicting values; retry against the authoritative revision.
          this.errorValue.set('The saved revision changed. Review the current values and retry.'); this.stateValue.set('error');
        }
        return false;
      }
      this.errorValue.set(errorMessage(outcome.error, 'The visualization could not be saved. Retry or discard your local changes.'));
      this.stateValue.set('error'); return false;
    }).catch(error => {
      if (this.disposed || generation !== this.generation) return false;
      this.errorValue.set(errorMessage(error, 'The visualization could not be saved.')); this.stateValue.set('error'); return false;
    }).finally(() => {
      if (generation !== this.generation || this.disposed) return;
      this.running = undefined; this.savingValue.set(false);
      if (this.state() === 'saving') this.updateState();
      this.setEnabled(); this.schedule();
    });
    this.running = operation;
    return operation;
  }

  private saveRetarget(): Promise<boolean> {
    if (this.running) return this.running;
    const pending = this.pendingRetarget();
    if (!pending || this.disposed || !this.workspace.isReady() || this.workspace.account()?.guid !== this.accountGuidValue()
      || this.workspace.hasPending() || this.unverified) return Promise.resolve(false);
    const generation = this.generation;
    this.clearTimer(); this.savingValue.set(true); this.stateValue.set('saving'); this.errorValue.set(undefined);
    const operation = this.commands.submit({ kind: 'retarget', accountGuid: this.accountGuidValue(), guid: this.guidValue(),
      expectedRevision: pending.revision, targetFacilities: pending.selection, reviewedDefinition: pending.submitted }).then(outcome => {
      if (this.disposed || generation !== this.generation) return false;
      if (outcome.state === 'committed') {
        this.pendingRetarget.set(undefined);
        this.acceptRecord(outcome.value);
        return !this.conflicts().length;
      }
      this.pinAuthority();
      if (outcome.state === 'refresh-required') {
        this.unverified = { submitted: pending.submitted, retarget: true };
        this.errorValue.set('Facility inclusion was saved, but the workspace could not refresh. Retry to recover the saved visualization.');
        this.stateValue.set('refresh-required'); return false;
      }
      if (outcome.state === 'conflict') {
        this.pendingRetarget.set(undefined); this.acceptRecord(outcome.current);
        this.errorValue.set('The saved visualization changed. Review the facility change again.');
      } else this.errorValue.set(errorMessage(outcome.error, 'Facility inclusion could not be saved. Retry or discard the proposed facility change.'));
      this.refreshDirty(); this.stateValue.set('error'); return false;
    }).catch(error => {
      if (!this.disposed && generation === this.generation) {
        this.errorValue.set(errorMessage(error, 'Facility inclusion could not be saved. Retry or discard the proposed facility change.'));
        this.stateValue.set('error');
      }
      return false;
    }).finally(() => {
      if (this.disposed || generation !== this.generation) return;
      this.running = undefined; this.savingValue.set(false); this.refreshDirty();
      if (this.state() === 'saving') this.updateState();
      this.setEnabled(); this.schedule();
    });
    this.running = operation;
    return operation;
  }

  private recover(): Promise<boolean> {
    if (this.recovering) return this.recovering;
    const operation = this.recoverPublication().finally(() => { if (this.recovering === operation) this.recovering = undefined; });
    this.recovering = operation;
    return operation;
  }

  private async recoverPublication(): Promise<boolean> {
    if (!this.unverified) return true;
    if (this.running) { await this.running; if (!this.unverified) return true; }
    if (!this.workspace.isReady() || this.workspace.account()?.guid !== this.accountGuidValue()) return false;
    const generation = this.generation, pending = this.unverified;
    this.savingValue.set(true);
    try {
      const recovered = await this.commands.recover(this.accountGuidValue(), this.guidValue());
      if (this.disposed || generation !== this.generation) return false;
      this.unverified = undefined; this.authorityPinned = false;
      if (pending.retarget) this.pendingRetarget.set(undefined);
      if (visualizationIntentEqual(this.repair, pending.repair)) this.repair = undefined;
      this.acceptRecord(recovered?.record, pending.retarget ? undefined : pending.submitted);
      this.errorValue.set(undefined);
      return !this.isMissing() && !this.conflicts().length
        && (this.state() !== 'readonly' || !!pending.retarget && !!this.definition());
    } catch (error) {
      if (!this.disposed && generation === this.generation) {
        this.errorValue.set(pending.retarget
          ? `Facility inclusion was saved, but workspace refresh is still required. Retry refresh to recover it. ${errorMessage(error, '')}`.trim()
          : errorMessage(error, 'The saved changes could not be recovered. Retry workspace refresh.'));
        this.stateValue.set('refresh-required');
      }
      return false;
    } finally {
      if (generation === this.generation && !this.disposed) {
        this.savingValue.set(false); this.refreshDirty(); if (!this.unverified) this.updateState(); this.setEnabled();
      }
    }
  }

  private pinAuthority(): void { this.authorityPublication = this.workspace.snapshot(); this.authorityPinned = true; }
  private refreshDirty(): void {
    this.dirtyValue.set(!!this.unverified || !!this.pendingRetarget() || !!this.repair || !!this.conflicts().length
      || !!this.draft() && (!this.baseline || !visualizationIntentEqual(normalizeVisualizationIntent(this.draft()!), this.baseline)));
  }
  private saveable(): boolean {
    const definition = this.draft();
    if (!definition || !this.record() || this.isMissing() || !this.canEdit() || this.unverified || this.conflicts().length || this.workspace.hasPending()) return false;
    const decoded = decodeVisualizationDefinition(normalizeVisualizationIntent(definition));
    return this.form.valid && (decoded.state === 'valid' || decoded.state === 'setup-required');
  }
  private updateState(): void {
    if (this.unverified) this.stateValue.set('refresh-required');
    else if (this.isMissing()) this.stateValue.set('missing');
    else if (!this.editableValue()) this.stateValue.set('readonly');
    else if (this.conflicts().length) this.stateValue.set('conflict');
    else if (this.saving()) this.stateValue.set('saving');
    else if (this.dirty()) {
      const decoded = this.draft() ? decodeVisualizationDefinition(normalizeVisualizationIntent(this.draft()!)) : undefined;
      this.stateValue.set(this.form.valid && decoded && (decoded.state === 'valid' || decoded.state === 'setup-required') ? 'dirty' : 'invalid');
    } else this.stateValue.set('saved');
  }
  private writeDraft(definition: VisualizationDefinition | undefined, reconcile: boolean): void {
    const raw = this.form.getRawValue();
    let next = definition ? structuredClone(definition) : undefined;
    if (next && reconcile) {
      if (raw.name.trim() === next.name.trim()) next = { ...next, name: raw.name };
      if (raw.title.trim() === (next.appearance.title?.trim() ?? '')) next = { ...next, appearance: {
        ...next.appearance, ...(raw.title ? { title: raw.title } : {})
      } };
    }
    const changed = !visualizationIntentEqual(this.draft(), next);
    this.draft.set(next);
    this.form.reset({ name: next?.name ?? '', title: next?.appearance.title ?? '', legend: next?.appearance.legend ?? true }, { emitEvent: false });
    if (changed) this.localRevisionValue.update(value => value + 1);
  }
  private setEnabled(): void {
    if (this.canEdit() && !this.unverified) this.form.enable({ emitEvent: false });
    else this.form.disable({ emitEvent: false });
  }
  private schedule(): void {
    this.clearTimer();
    if (this.disposed || this.running || !this.dirty() || !this.saveable()
      || ['error', 'conflict', 'readonly', 'refresh-required', 'missing'].includes(this.state())) return;
    this.timer = setTimeout(() => { this.timer = undefined; void this.saveOnce(); }, Math.max(0, (this.dueAt ?? Date.now()) - Date.now()));
  }
  private clearTimer(): void { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined; }
}

function errorMessage(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }
