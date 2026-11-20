import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { facilityAnalysisPairWritePatch } from '../../../single-facility-analysis-pair.service';

export type AnalysisAutosaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'invalid' | 'error';
export const ANALYSIS_AUTOSAVE_DEBOUNCE_MS = 650;

@Injectable()
export class FacilityAnalysisAutosaveService {
  private readonly context = inject(FacilityAnalysisWorkbenchContext);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stateValue = signal<AnalysisAutosaveState>('idle');
  private readonly draftValue = signal<IdbAnalysisItem | undefined>(undefined);
  private readonly draftResetVersionValue = signal(0);
  private readonly committedValue = signal<IdbAnalysisItem | undefined>(undefined);
  private readonly errorValue = signal<string | undefined>(undefined);
  private debounceHandle: ReturnType<typeof setTimeout> | undefined;
  private editVersion = 0;
  private saving = false;
  private saveQueued = false;
  private activeGuid = '';
  private readonly deletionHeldValue = signal(false);
  private readonly deletionCompletedValue = signal(false);
  private deletedGuid = '';
  readonly deletionActive = computed(() => this.deletionHeldValue() || this.deletionCompletedValue());
  private saveWaiters = new Set<() => void>();
  private contextVersion = 0;
  readonly deletionHeld = this.deletionHeldValue.asReadonly();

  readonly state = this.stateValue.asReadonly();
  readonly draft = this.draftValue.asReadonly();
  /** Changes only when the draft is discarded or a new analysis context is loaded. */
  readonly draftResetVersion = this.draftResetVersionValue.asReadonly();
  readonly committed = this.committedValue.asReadonly();
  readonly error = this.errorValue.asReadonly();
  readonly isDirty = computed(() => ['dirty', 'invalid', 'error'].includes(this.stateValue()));
  readonly isBlocked = computed(() => this.stateValue() === 'saving' || this.deletionHeld());
  readonly canRetry = computed(() => this.stateValue() === 'error');
  readonly canDiscard = computed(() => this.isDirty());

  private readonly syncCommittedEffect = effect(() => {
    if (this.deletionHeld()) return;
    const analysis = this.context.analysis();
    if (this.deletionCompletedValue()) {
      if (!analysis || analysis.guid === this.deletedGuid) return;
      this.deletionCompletedValue.set(false);
    }
    if (!analysis) {
      this.reset(undefined);
      return;
    }
    if (analysis.guid !== this.activeGuid) {
      this.reset(analysis);
      return;
    }
    if (this.stateValue() === 'idle' || this.stateValue() === 'saved') {
      this.committedValue.set(cloneAnalysis(analysis));
      this.draftValue.set(cloneAnalysis(analysis));
    }
  });

  constructor() {
    const unregister = this.unsavedChanges.register(
      () => this.isDirty(),
      () => this.discard(),
      () => this.isBlocked()
    );
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!this.isDirty() && !this.isBlocked()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', beforeUnload);
    this.destroyRef.onDestroy(() => {
      unregister();
      this.contextVersion += 1;
      this.clearDebounce();
      if (typeof window !== 'undefined') window.removeEventListener('beforeunload', beforeUnload);
    });
  }

  update(
    mutator: (draft: IdbAnalysisItem) => void,
    options: { immediate?: boolean; valid?: boolean | ((draft: IdbAnalysisItem) => boolean) } = {}
  ): void {
    const current = this.draftValue();
    if (!current || this.deletionHeld() || this.destroyRef.destroyed) return;
    const next = cloneAnalysis(current);
    mutator(next);
    next.modifiedDate = new Date();
    this.editVersion += 1;
    this.draftValue.set(next);
    this.errorValue.set(undefined);
    this.clearDebounce();
    const valid = typeof options.valid === 'function' ? options.valid(next) : options.valid;
    if (valid === false) {
      this.stateValue.set('invalid');
      return;
    }
    this.stateValue.set('dirty');
    if (options.immediate) {
      void this.save();
    } else {
      this.debounceHandle = setTimeout(() => void this.save(), ANALYSIS_AUTOSAVE_DEBOUNCE_MS);
    }
  }

  markInvalid(): void {
    if (this.deletionHeld()) return;
    this.clearDebounce();
    if (this.draftValue()) this.stateValue.set('invalid');
  }

  retry(): void {
    if (this.deletionHeld() || this.stateValue() !== 'error') return;
    this.stateValue.set('dirty');
    this.errorValue.set(undefined);
    void this.save();
  }

  discard(): void {
    if (this.deletionHeld()) return;
    this.clearDebounce();
    this.editVersion += 1;
    this.saveQueued = false;
    this.errorValue.set(undefined);
    this.draftValue.set(cloneAnalysis(this.committedValue()));
    this.draftResetVersionValue.set(this.editVersion);
    this.stateValue.set(this.draftValue() ? 'saved' : 'idle');
  }

  async flush(): Promise<boolean> {
    if (this.deletionHeld()) return false;
    this.clearDebounce();
    if (this.stateValue() === 'invalid' || this.stateValue() === 'error') return false;
    if (this.stateValue() === 'dirty') await this.save();
    return !this.isDirty() && !this.isBlocked();
  }

  /** Freeze this editor without saving or discarding its draft, then drain an existing write. */
  async beginDeletion(): Promise<boolean> {
    if (this.deletionHeld() || !this.activeGuid || this.destroyRef.destroyed) return false;
    const guid = this.activeGuid;
    const accountGuid = this.context.account()?.guid;
    this.deletionHeldValue.set(true);
    this.clearDebounce();
    this.saveQueued = false;
    if (this.saving) await new Promise<void>(resolve => this.saveWaiters.add(resolve));
    return this.deletionHeld() && this.context.analysis()?.guid === guid
      && this.context.account()?.guid === accountGuid;
  }

  cancelDeletion(): void {
    if (!this.deletionHeld()) return;
    this.deletionHeldValue.set(false);
    if (this.destroyRef.destroyed) return;
    if (this.context.analysis()?.guid !== this.activeGuid) {
      this.reset(this.context.analysis());
    } else if (this.stateValue() === 'dirty') {
      this.debounceHandle = setTimeout(() => void this.save(), ANALYSIS_AUTOSAVE_DEBOUNCE_MS);
    }
  }

  completeDeletion(): void {
    if (!this.deletionHeld()) return;
    this.deletedGuid = this.activeGuid;
    this.deletionCompletedValue.set(true);
    this.reset(undefined);
    this.deletionHeldValue.set(false);
  }

  private async save(): Promise<void> {
    this.clearDebounce();
    const draft = this.draftValue();
    const account = this.context.account();
    if (this.destroyRef.destroyed || this.deletionHeld() || !draft || !account || this.stateValue() === 'invalid') return;
    if (this.saving) {
      this.saveQueued = true;
      return;
    }

    const submitted = cloneAnalysis(draft)!;
    const submittedVersion = this.editVersion;
    const submittedContext = this.contextVersion;
    const saveWaiters = this.saveWaiters;
    this.saving = true;
    this.stateValue.set('saving');
    this.errorValue.set(undefined);
    try {
      const result = await this.commandBoundary.execute(
        {
          entityKind: 'facilityAnalysis',
          changeKind: 'update',
          entityGuid: submitted.guid,
          label: 'Saving facility analysis',
          notification: { suppressSuccessToast: true },
          publication: { mode: 'patch', buildPatch: facilityAnalysisPairWritePatch }
        },
        () => this.analysisHandler.updateFacilityAnalysisWithSingleSitePair(submitted, account.guid)
      );
      if (this.activeGuid !== submitted.guid || this.contextVersion !== submittedContext) return;
      this.committedValue.set(cloneAnalysis(result.value.analysis));
      if (submittedVersion === this.editVersion) {
        this.draftValue.set(cloneAnalysis(result.value.analysis));
        this.stateValue.set('saved');
      } else if (this.stateValue() !== 'invalid') {
        this.stateValue.set('dirty');
        this.saveQueued = true;
      }
    } catch (error) {
      if (this.activeGuid !== submitted.guid || this.contextVersion !== submittedContext) return;
      this.stateValue.set('error');
      this.errorValue.set(error instanceof Error ? error.message : 'The analysis could not be saved.');
      this.saveQueued = false;
    } finally {
      saveWaiters.forEach(resolve => resolve());
      saveWaiters.clear();
      if (this.contextVersion !== submittedContext) return;
      this.saving = false;
      if (!this.deletionHeld() && this.saveQueued && this.stateValue() !== 'error' && this.stateValue() !== 'invalid') {
        this.saveQueued = false;
        queueMicrotask(() => void this.save());
      }
    }
  }

  private reset(analysis: IdbAnalysisItem | undefined): void {
    this.clearDebounce();
    this.activeGuid = analysis?.guid ?? '';
    this.contextVersion += 1;
    this.saveWaiters = new Set();
    this.editVersion += 1;
    this.saving = false;
    this.saveQueued = false;
    this.errorValue.set(undefined);
    this.committedValue.set(cloneAnalysis(analysis));
    this.draftValue.set(cloneAnalysis(analysis));
    this.draftResetVersionValue.set(this.editVersion);
    this.stateValue.set(analysis ? 'idle' : 'idle');
  }

  private clearDebounce(): void {
    if (this.debounceHandle !== undefined) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = undefined;
    }
  }
}

function cloneAnalysis(analysis: IdbAnalysisItem | undefined): IdbAnalysisItem | undefined {
  return analysis ? structuredClone(analysis) : undefined;
}
