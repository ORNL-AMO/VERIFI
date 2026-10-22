import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { FacilityReportActionsService } from '../../facility-report-actions.service';
import { FacilityReportWorkbenchContext } from '../facility-report-workbench-context.service';

export type ReportAutosaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'invalid' | 'error';
export const REPORT_AUTOSAVE_DEBOUNCE_MS = 650;

@Injectable()
export class FacilityReportAutosaveService {
  private readonly context = inject(FacilityReportWorkbenchContext);
  private readonly actions = inject(FacilityReportActionsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly unsaved = inject(UnsavedChangesService);
  private readonly stateValue = signal<ReportAutosaveState>('idle');
  private readonly pending = signal(false);
  private readonly errorValue = signal<string | undefined>(undefined);
  private timer?: ReturnType<typeof setTimeout>;
  private running?: Promise<boolean>;
  private generation = 0;
  private activeKey = '';
  private editVersion = 0;
  private synchronizedEditVersion = 0;
  readonly name = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] });
  readonly state = this.stateValue.asReadonly();
  readonly error = this.errorValue.asReadonly();
  readonly saving = this.pending.asReadonly();
  readonly isDirty = computed(() => ['dirty', 'invalid', 'error'].includes(this.state()));
  readonly needsProtection = computed(() => this.isDirty() || this.saving());
  readonly canEdit = computed(() => !!this.context.report() && this.context.workspace.canWrite()
    && (!this.context.workspace.hasPending() || this.saving()));

  constructor() {
    effect(() => {
      const key = this.context.key();
      const report = this.context.report();
      const canEdit = this.canEdit();
      untracked(() => {
        if (key !== this.activeKey || !report) {
          this.clearTimer();
          this.activeKey = key;
          this.generation++;
          this.running = undefined;
          this.pending.set(false);
          this.stateValue.set('idle');
          this.errorValue.set(undefined);
          this.name.reset(report?.name ?? '', { emitEvent: false });
          this.synchronizedEditVersion = this.editVersion;
        } else if (!this.needsProtection() && this.editVersion === this.synchronizedEditVersion) {
          this.name.setValue(report.name, { emitEvent: false });
        }
        if (canEdit) this.name.enable({ emitEvent: false });
        else this.name.disable({ emitEvent: false });
      });
    });
    this.name.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      this.editVersion++;
      this.clearTimer();
      this.errorValue.set(undefined);
      if (!value.trim()) this.stateValue.set('invalid');
      else if (!this.saving() && value.trim() === this.context.report()?.name) {
        if (value === this.context.report()?.name) this.synchronizedEditVersion = this.editVersion;
        this.stateValue.set('saved');
      }
      else {
        this.stateValue.set('dirty');
        this.timer = setTimeout(() => { void this.flush(); }, REPORT_AUTOSAVE_DEBOUNCE_MS);
      }
    });
    const unregister = this.unsaved.register(() => this.isDirty(), () => this.discard(), () => this.saving(), () => this.flush());
    this.destroyRef.onDestroy(() => { this.generation++; this.clearTimer(); unregister(); });
  }

  flush(): Promise<boolean> {
    this.clearTimer();
    if (this.running) return this.running;
    if (!this.needsProtection()) return Promise.resolve(true);
    if (this.state() === 'invalid' || this.state() === 'error') return Promise.resolve(false);
    const operation = this.persistUntilClean();
    this.running = operation;
    void operation.finally(() => { if (this.running === operation) this.running = undefined; });
    return operation;
  }

  retry(): void {
    if (this.state() !== 'error') return;
    this.stateValue.set('dirty');
    this.errorValue.set(undefined);
    void this.flush();
  }

  discard(): void {
    if (this.saving()) return;
    this.clearTimer();
    this.name.reset(this.context.report()?.name ?? '', { emitEvent: false });
    this.synchronizedEditVersion = this.editVersion;
    this.errorValue.set(undefined);
    this.stateValue.set('idle');
  }

  private async persistUntilClean(): Promise<boolean> {
    const generation = this.generation;
    const key = this.context.key();
    try {
      while (generation === this.generation && key === this.context.key() && !this.destroyRef.destroyed) {
        const report = this.context.report();
        const name = this.name.value.trim();
        const submittedEditVersion = this.editVersion;
        if (!report || !this.context.workspace.canWrite()) throw new Error('The report workspace is unavailable. Try again or discard your changes.');
        if (!name) { this.stateValue.set('invalid'); return false; }
        if (name === report.name) {
          if (this.name.value === name) this.synchronizedEditVersion = submittedEditVersion;
          this.stateValue.set('saved');
          return true;
        }
        this.pending.set(true);
        this.stateValue.set('saving');
        const saved = await this.actions.updateName(report.facilityId, report.guid, name);
        if (generation !== this.generation || key !== this.context.key() || this.destroyRef.destroyed) return false;
        if (this.name.value.trim() === saved.name) {
          // A newer raw edit may only add whitespace needed for continued typing.
          if (this.editVersion === submittedEditVersion) {
            this.name.setValue(saved.name, { emitEvent: false });
            this.synchronizedEditVersion = submittedEditVersion;
          }
          this.stateValue.set('saved');
          return true;
        }
      }
      return false;
    } catch (error) {
      if (generation === this.generation && key === this.context.key() && !this.destroyRef.destroyed) {
        this.stateValue.set('error');
        this.errorValue.set(error instanceof Error ? error.message : 'The report could not be saved.');
      }
      return false;
    } finally {
      if (generation === this.generation) this.pending.set(false);
    }
  }

  private clearTimer(): void { if (this.timer !== undefined) { clearTimeout(this.timer); this.timer = undefined; } }
}
