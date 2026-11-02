import { DestroyRef, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';

export type ReportAutosaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'invalid' | 'error';
export const REPORT_AUTOSAVE_DEBOUNCE_MS = 650;
export interface ReportWorkbenchEditor {
  readonly state: Signal<ReportAutosaveState>;
  readonly error: Signal<string | undefined>;
  readonly saving: Signal<boolean>;
  readonly isDirty: Signal<boolean>;
  retry(): void;
  discard(): void;
  pauseAutosave(): void;
  resumeAutosave(): void;
}
interface ReportAutosaveAdapter<T> {
  readonly key: Signal<string>;
  readonly saved: Signal<T | undefined>;
  readonly canWrite: Signal<boolean>;
  readonly hasPending: Signal<boolean>;
  readonly changes: Observable<unknown>;
  read(): T;
  normalize(value: T): T;
  valid(value: T): boolean;
  hydrate(value: T | undefined): void;
  setEnabled(enabled: boolean): void;
  persist(value: T, saved: T, force: boolean): Promise<T>;
}

/** Shared scheduling and protection. Scope-specific adapters own fields and commands. */
export class ReportAutosaveController<T> implements ReportWorkbenchEditor {
  private readonly destroy = inject(DestroyRef);
  private readonly stateValue = signal<ReportAutosaveState>('idle');
  private readonly errorValue = signal<string | undefined>(undefined);
  private readonly pending = signal(false);
  private timer?: ReturnType<typeof setTimeout>;
  private running?: Promise<boolean>;
  private generation = 0;
  private activeKey = '';
  private editVersion = 0;
  private synchronizedVersion = 0;
  private forceSave = false;
  private paused = false;
  readonly state = this.stateValue.asReadonly();
  readonly error = this.errorValue.asReadonly();
  readonly saving = this.pending.asReadonly();
  readonly isDirty = computed(() => ['dirty', 'invalid', 'error'].includes(this.state()));
  readonly needsProtection = computed(() => this.isDirty() || this.saving());
  readonly canEdit = computed(() => !!this.adapter.saved() && this.adapter.canWrite() && (!this.adapter.hasPending() || this.saving()));

  constructor(private readonly adapter: ReportAutosaveAdapter<T>) {
    effect(() => {
      const key = adapter.key(), saved = adapter.saved(), canEdit = this.canEdit();
      untracked(() => {
        if (key !== this.activeKey || !saved) {
          this.clearTimer(); this.activeKey = key; this.generation++; this.running = undefined;
          this.pending.set(false); this.forceSave = false; this.paused = false; this.stateValue.set('idle'); this.errorValue.set(undefined);
          adapter.hydrate(saved); this.synchronizedVersion = this.editVersion;
        } else if (!this.needsProtection() && this.editVersion === this.synchronizedVersion) adapter.hydrate(saved);
        adapter.setEnabled(canEdit);
      });
    });
    adapter.changes.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.editVersion++; this.clearTimer(); this.errorValue.set(undefined);
      const raw = adapter.read(), normalized = adapter.normalize(raw);
      if (!adapter.valid(raw)) this.stateValue.set('invalid');
      else if (!this.saving() && !this.forceSave && this.equal(normalized, adapter.saved())) {
        if (this.equal(raw, adapter.saved())) this.synchronizedVersion = this.editVersion;
        this.stateValue.set('saved');
      } else {
        this.stateValue.set('dirty');
        if (!this.paused) this.timer = setTimeout(() => { void this.flush(); }, REPORT_AUTOSAVE_DEBOUNCE_MS);
      }
    });
    const unregister = inject(UnsavedChangesService).register(() => this.isDirty(), () => this.discard(), () => this.saving(), () => this.flush());
    this.destroy.onDestroy(() => { this.generation++; this.clearTimer(); unregister(); });
  }
  flush(): Promise<boolean> {
    this.clearTimer();
    if (this.paused) return Promise.resolve(false);
    if (this.running) return this.running;
    if (!this.needsProtection()) return Promise.resolve(true);
    if (this.state() === 'invalid' || this.state() === 'error') return Promise.resolve(false);
    const operation = this.persistUntilClean(); this.running = operation;
    void operation.finally(() => { if (this.running === operation) this.running = undefined; });
    return operation;
  }
  retry(): void {
    if (this.state() !== 'error') return;
    this.stateValue.set('dirty'); this.errorValue.set(undefined); void this.flush();
  }
  refresh(): void {
    if (!this.canEdit() || this.saving() || !this.adapter.valid(this.adapter.read())) return;
    this.forceSave = true; this.stateValue.set('dirty'); void this.flush();
  }
  discard(): void {
    if (this.saving()) return;
    this.clearTimer(); this.adapter.hydrate(this.adapter.saved()); this.synchronizedVersion = this.editVersion;
    this.forceSave = false; this.errorValue.set(undefined); this.stateValue.set('idle');
  }
  pauseAutosave(): void { this.paused = true; this.clearTimer(); }
  resumeAutosave(): void {
    this.paused = false;
    if (this.state() === 'dirty') this.timer = setTimeout(() => { void this.flush(); }, REPORT_AUTOSAVE_DEBOUNCE_MS);
  }
  private async persistUntilClean(): Promise<boolean> {
    const generation = this.generation, key = this.adapter.key();
    try {
      while (generation === this.generation && key === this.adapter.key() && !this.destroy.destroyed) {
        const saved = this.adapter.saved(), raw = this.adapter.read(), value = this.adapter.normalize(raw), version = this.editVersion;
        if (!saved || !this.adapter.canWrite()) throw new Error('The report workspace is unavailable. Try again or discard your changes.');
        if (!this.adapter.valid(raw)) { this.stateValue.set('invalid'); return false; }
        if (!this.forceSave && this.equal(value, saved)) {
          if (this.equal(raw, saved)) this.synchronizedVersion = version;
          this.stateValue.set('saved'); return true;
        }
        this.pending.set(true); this.stateValue.set('saving');
        const committed = await this.adapter.persist(value, saved, this.forceSave);
        if (generation !== this.generation || key !== this.adapter.key() || this.destroy.destroyed) return false;
        this.forceSave = false;
        if (this.equal(this.adapter.normalize(this.adapter.read()), committed)) {
          if (this.editVersion === version) { this.adapter.hydrate(committed); this.synchronizedVersion = version; }
          this.stateValue.set('saved'); return true;
        }
      }
      return false;
    } catch (error) {
      if (generation === this.generation && key === this.adapter.key() && !this.destroy.destroyed) {
        this.stateValue.set('error'); this.errorValue.set(error instanceof Error ? error.message : 'The report could not be saved.');
      }
      return false;
    } finally { if (generation === this.generation) this.pending.set(false); }
  }
  private equal(first: T | undefined, second: T | undefined): boolean { return JSON.stringify(first) === JSON.stringify(second); }
  private clearTimer(): void { if (this.timer !== undefined) { clearTimeout(this.timer); this.timer = undefined; } }
}
