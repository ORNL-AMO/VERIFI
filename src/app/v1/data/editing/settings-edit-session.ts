import { DestroyRef, Injector, Signal, assertInInjectionContext, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { ConflictChoices, DraftConflict, DraftMerge, EditorConflictError, draftEqual } from './draft-reconciliation';
import { registerDataDraft } from './register-data-draft';

export type EditSaveMode = 'debounced' | 'immediate';
export type SettingsEditState = 'idle' | 'dirty' | 'saving' | 'saved' | 'invalid' | 'error' | 'conflict';
export interface SettingsEditAdapter<T> {
  readonly key: Signal<string>;
  readonly saved: Signal<T | undefined>;
  readonly canWrite: Signal<boolean>;
  readonly pendingOwners: Signal<readonly (string | undefined)[]>;
  readonly changes: Observable<EditSaveMode>;
  read(): T;
  hydrate(value: T | undefined): void;
  normalize(value: T): T;
  valid(value: T): boolean;
  reconcile(base: T, local: T, saved: T, choices?: ConflictChoices): DraftMerge<T>;
  persist(value: T, base: T, ownerId: string): Promise<T>;
  setEnabled(enabled: boolean): void;
}

export const SETTINGS_EDIT_DEBOUNCE_MS = 650;
let nextSession = 0;

/** Creates a settings editor owned by the current Angular host's lifetime. */
export function injectSettingsEditSession<T>(adapter: SettingsEditAdapter<T>): SettingsEditSession<T> {
  assertInInjectionContext(injectSettingsEditSession);
  const session = new SettingsEditSession(adapter, inject(DestroyRef), inject(Injector));
  registerDataDraft(session.dirty, () => session.discard(), session.saving);
  return session;
}

/** Scheduling and acknowledgement only; feature adapters own values, rules, and commands. */
export class SettingsEditSession<T> {
  private readonly sessionId = ++nextSession;
  private readonly generation = signal(0);
  private readonly stateValue = signal<SettingsEditState>('idle');
  private readonly dirtyValue = signal(false);
  private readonly savingValue = signal(false);
  private readonly errorValue = signal<string | undefined>(undefined);
  private readonly conflictValue = signal<readonly DraftConflict[]>([]);
  private baseline?: T;
  private latest?: T;
  /** Source publication identity is separate from snapshots returned by a failed command. */
  private observedSaved?: T;
  private unverifiedCommit = false;
  private activeKey = '';
  private timer?: ReturnType<typeof setTimeout>;
  private dueAt?: number;
  private running?: Promise<boolean>;
  private submitted?: T;
  private targetMissing = false;
  private readonly destroyed = signal(false);

  readonly state = this.stateValue.asReadonly();
  readonly dirty = this.dirtyValue.asReadonly();
  readonly saving = this.savingValue.asReadonly();
  readonly error = this.errorValue.asReadonly();
  readonly conflicts = this.conflictValue.asReadonly();
  readonly invalid = computed(() => this.state() === 'invalid');
  readonly canEdit = computed(() => {
    if (this.destroyed()) return false;
    const owners = this.adapter.pendingOwners();
    const mine = owners.some(owner => owner === this.ownerId);
    return !!this.adapter.key() && !!this.adapter.saved()
      && (this.adapter.canWrite() || mine)
      && owners.every(owner => owner === this.ownerId);
  });
  get ownerId(): string { return `data-editor-${this.sessionId}:${this.generation()}`; }

  constructor(private readonly adapter: SettingsEditAdapter<T>, destroyRef: DestroyRef, injector: Injector) {
    this.reset(adapter.key(), adapter.saved());
    effect(() => {
      const key = adapter.key(), saved = adapter.saved(), enabled = this.canEdit();
      untracked(() => {
        if (this.destroyed()) return;
        if (key !== this.activeKey) this.reset(key, saved);
        else if (!this.saving()) this.acceptCommitted(saved);
        adapter.setEnabled(enabled);
        this.scheduleDue();
      });
    }, { injector });
    adapter.changes.pipe(takeUntilDestroyed(destroyRef)).subscribe(mode => this.edited(mode));
    destroyRef.onDestroy(() => this.cleanup());
  }

  edited(mode: EditSaveMode = 'debounced'): void {
    if (this.destroyed() || !this.baseline || !this.latest) return;
    this.clearTimer(); this.errorValue.set(undefined);
    this.dueAt = mode === 'immediate' ? Date.now() : Date.now() + SETTINGS_EDIT_DEBOUNCE_MS;
    const local = this.adapter.normalize(this.adapter.read());
    if (this.conflicts().length) {
      const merged = this.adapter.reconcile(this.baseline, local, this.latest);
      this.baseline = structuredClone(merged.baseline ?? (merged.conflicts.length ? this.baseline : this.latest));
      this.conflictValue.set(merged.conflicts);
      this.adapter.hydrate(merged.value);
      if (merged.conflicts.length) { this.dirtyValue.set(true); this.stateValue.set('conflict'); return; }
    }
    this.refreshDirty();
    if (!this.dirty()) { this.dueAt = undefined; this.stateValue.set(this.saving() ? 'saving' : 'saved'); return; }
    this.stateValue.set(this.saving() ? 'saving' : this.adapter.valid(this.adapter.read()) ? 'dirty' : 'invalid');
    this.scheduleDue();
  }

  async saveNow(): Promise<boolean> {
    if (this.destroyed()) return false;
    this.clearTimer(); this.dueAt = Date.now();
    if (this.running) return this.running;
    if (!this.baseline || !this.adapter.saved() || this.conflicts().length) return false;
    this.refreshDirty();
    if (!this.dirty()) { this.dueAt = undefined; return true; }
    if (!this.adapter.valid(this.adapter.read())) { this.stateValue.set('invalid'); return false; }
    if (!this.canEdit() || !this.adapter.canWrite()) return false;
    this.errorValue.set(undefined);
    const generation = this.generation();
    const operation = this.persist(generation);
    this.running = operation;
    try { return await operation; }
    finally {
      if (this.running === operation) this.running = undefined;
      if (generation === this.generation() && !this.destroyed()) this.scheduleDue();
    }
  }

  retry(): void { if (!this.saving()) { this.errorValue.set(undefined); void this.saveNow(); } }

  acceptCommitted(saved: T | undefined = this.adapter.saved()): void {
    if (this.destroyed() || this.saving()) return;
    if (Object.is(saved, this.observedSaved)) return;
    this.observedSaved = saved;
    if (!saved) {
      if (this.baseline) { this.targetMissing = true; this.clearTimer(); this.errorValue.set('This saved item is no longer available.'); this.stateValue.set('error'); }
      return;
    }
    const restored = this.targetMissing;
    if (restored) { this.targetMissing = false; this.errorValue.set(undefined); }
    const next = this.adapter.normalize(saved);
    if (!this.baseline) { this.reset(this.activeKey, saved); return; }
    const wasConflict = this.conflicts().length > 0;
    const wasUnverified = this.unverifiedCommit;
    this.unverifiedCommit = false;
    if (draftEqual(next, this.latest) && !restored && !wasUnverified) return;
    const merged = this.adapter.reconcile(this.baseline, this.adapter.normalize(this.adapter.read()), next);
    this.latest = structuredClone(next);
    this.adapter.hydrate(merged.value);
    this.conflictValue.set(merged.conflicts);
    this.baseline = structuredClone(merged.baseline ?? (merged.conflicts.length ? this.baseline : next));
    this.refreshDirty();
    if (merged.conflicts.length) { this.clearTimer(); this.stateValue.set('conflict'); }
    else if (!this.dirty()) { this.clearTimer(); this.dueAt = undefined; this.stateValue.set('saved'); this.errorValue.set(undefined); }
    else if (restored || this.state() !== 'error') {
      if (wasConflict && this.dueAt === undefined) this.dueAt = Date.now();
      this.stateValue.set(this.adapter.valid(this.adapter.read()) ? 'dirty' : 'invalid');
      this.scheduleDue();
    }
  }

  resolveConflicts(choices: ConflictChoices): void {
    if (this.destroyed() || this.saving() || !this.baseline || !this.latest) return;
    const reviewed = this.latest;
    this.acceptCommitted();
    if (this.saving() || this.targetMissing || this.latest !== reviewed) return;
    const merged = this.adapter.reconcile(this.baseline, this.adapter.normalize(this.adapter.read()), this.latest, choices);
    this.adapter.hydrate(merged.value); this.conflictValue.set(merged.conflicts);
    this.baseline = structuredClone(merged.baseline ?? (merged.conflicts.length ? this.baseline : this.latest));
    if (merged.conflicts.length) return;
    this.refreshDirty();
    this.errorValue.set(undefined);
    if (this.dirty()) void this.saveNow(); else this.stateValue.set('saved');
  }

  discard(): void {
    if (this.destroyed() || this.saving()) return;
    this.clearTimer(); this.dueAt = undefined;
    const key = this.adapter.key(), saved = this.adapter.saved();
    const authoritative = key === this.activeKey && saved !== undefined && Object.is(saved, this.observedSaved)
      ? this.latest : saved;
    this.reset(key, authoritative, saved);
  }

  private cleanup(): void {
    this.destroyed.set(true); this.generation.update(value => value + 1);
    this.clearTimer(); this.dueAt = undefined; this.running = undefined; this.submitted = undefined;
    this.observedSaved = undefined; this.unverifiedCommit = false;
    this.savingValue.set(false); this.dirtyValue.set(false); this.conflictValue.set([]); this.errorValue.set(undefined);
    this.stateValue.set('idle');
  }

  private reset(key: string, saved: T | undefined, source: T | undefined = saved): void {
    this.clearTimer(); this.dueAt = undefined; this.activeKey = key;
    this.generation.update(value => value + 1); this.running = undefined;
    this.submitted = undefined;
    this.observedSaved = source; this.unverifiedCommit = false;
    this.targetMissing = false;
    this.baseline = saved === undefined ? undefined : structuredClone(this.adapter.normalize(saved));
    this.latest = this.baseline === undefined ? undefined : structuredClone(this.baseline);
    this.dirtyValue.set(false); this.savingValue.set(false); this.conflictValue.set([]); this.errorValue.set(undefined);
    this.stateValue.set('idle'); this.adapter.hydrate(saved);
  }

  private async persist(generation: number): Promise<boolean> {
    const submitted = structuredClone(this.adapter.normalize(this.adapter.read()));
    this.submitted = submitted;
    const base = structuredClone(this.baseline!);
    this.dueAt = undefined; this.savingValue.set(true); this.stateValue.set('saving');
    try {
      const committed = this.adapter.normalize(await this.adapter.persist(submitted, base, this.ownerId));
      if (this.destroyed() || generation !== this.generation()) return false;
      this.unverifiedCommit = false;
      const merged = this.adapter.reconcile(submitted, this.adapter.normalize(this.adapter.read()), committed);
      this.baseline = structuredClone(merged.baseline ?? (merged.conflicts.length ? submitted : committed)); this.latest = structuredClone(committed);
      this.submitted = undefined;
      this.adapter.hydrate(merged.value); this.conflictValue.set(merged.conflicts); this.refreshDirty();
      this.stateValue.set(merged.conflicts.length ? 'conflict' : this.dirty()
        ? this.adapter.valid(this.adapter.read()) ? 'dirty' : 'invalid' : 'saved');
      return !this.dirty();
    } catch (error) {
      if (this.destroyed() || generation !== this.generation()) return false;
      this.clearTimer();
      this.submitted = undefined;
      const conflict = unwrapConflict(error);
      if (conflict) {
        this.unverifiedCommit = false;
        this.observedSaved = this.adapter.saved();
        this.latest = structuredClone(this.adapter.normalize(conflict.saved as T));
        const merged = this.adapter.reconcile(base, this.adapter.normalize(this.adapter.read()), this.latest);
        this.baseline = structuredClone(merged.baseline ?? (merged.conflicts.length ? base : this.latest));
        this.adapter.hydrate(merged.value); this.conflictValue.set(merged.conflicts);
        this.stateValue.set(merged.conflicts.length ? 'conflict' : 'dirty');
      } else {
        if (persistenceCommitted(error)) {
          // The write succeeded; a later reversion is relative to the submitted revision.
          this.baseline = structuredClone(submitted); this.latest = structuredClone(submitted);
          this.unverifiedCommit = true;
          // Publications observed before the failure cannot verify this committed revision.
          this.observedSaved = this.adapter.saved();
        }
        this.dueAt = undefined; this.stateValue.set('error');
        this.errorValue.set(error instanceof Error ? error.message : 'Changes could not be saved. Try again.');
      }
      this.refreshDirty(); return false;
    } finally {
      if (!this.destroyed() && generation === this.generation()) {
        this.savingValue.set(false); this.submitted = undefined; this.acceptCommitted();
      }
    }
  }

  private refreshDirty(): void {
    const local = this.adapter.normalize(this.adapter.read());
    this.dirtyValue.set(!!this.baseline && (this.unverifiedCommit || this.conflicts().length > 0
      || (this.saving() && this.submitted !== undefined && !draftEqual(local, this.submitted))
      || !draftEqual(local, this.latest ?? this.baseline)));
  }

  private scheduleDue(): void {
    if (this.destroyed() || this.running || this.saving() || this.dueAt === undefined || !this.dirty()
      || this.conflicts().length || this.state() === 'error' || !this.canEdit()
      || !this.adapter.valid(this.adapter.read())) return;
    this.clearTimer();
    const delay = this.dueAt - Date.now();
    if (delay <= 0) { void this.saveNow(); return; }
    this.timer = setTimeout(() => { this.timer = undefined; void this.saveNow(); }, delay);
  }

  private clearTimer(): void { if (this.timer !== undefined) { clearTimeout(this.timer); this.timer = undefined; } }
}

function persistenceCommitted(error: unknown): boolean {
  const visited = new Set<unknown>();
  while (error && typeof error === 'object' && !visited.has(error)) {
    if (error instanceof WorkspaceWriteError) return error.persistenceCommitted;
    visited.add(error); error = 'cause' in error ? error.cause : undefined;
  }
  return false;
}

function unwrapConflict(error: unknown): EditorConflictError | undefined {
  const visited = new Set<unknown>();
  while (error && typeof error === 'object' && !visited.has(error)) {
    if (error instanceof EditorConflictError) return error;
    visited.add(error); error = 'cause' in error ? error.cause : undefined;
  }
  return undefined;
}
