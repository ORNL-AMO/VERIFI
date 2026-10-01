import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { FacilityAnalysisWorkbenchContext } from './facility-analysis-workbench-context.service';

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
  private readonly committedValue = signal<IdbAnalysisItem | undefined>(undefined);
  private readonly errorValue = signal<string | undefined>(undefined);
  private debounceHandle: ReturnType<typeof setTimeout> | undefined;
  private editVersion = 0;
  private saving = false;
  private saveQueued = false;
  private activeGuid = '';

  readonly state = this.stateValue.asReadonly();
  readonly draft = this.draftValue.asReadonly();
  readonly committed = this.committedValue.asReadonly();
  readonly error = this.errorValue.asReadonly();
  readonly isDirty = computed(() => ['dirty', 'invalid', 'error'].includes(this.stateValue()));
  readonly isBlocked = computed(() => this.stateValue() === 'saving');
  readonly canRetry = computed(() => this.stateValue() === 'error');
  readonly canDiscard = computed(() => this.isDirty());

  private readonly syncCommittedEffect = effect(() => {
    const analysis = this.context.analysis();
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
      this.clearDebounce();
      if (typeof window !== 'undefined') window.removeEventListener('beforeunload', beforeUnload);
    });
  }

  update(mutator: (draft: IdbAnalysisItem) => void, options: { immediate?: boolean; valid?: boolean } = {}): void {
    const current = this.draftValue();
    if (!current) return;
    const next = cloneAnalysis(current);
    mutator(next);
    next.modifiedDate = new Date();
    this.editVersion += 1;
    this.draftValue.set(next);
    this.errorValue.set(undefined);
    this.clearDebounce();
    if (options.valid === false) {
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
    this.clearDebounce();
    if (this.draftValue()) this.stateValue.set('invalid');
  }

  retry(): void {
    if (this.stateValue() !== 'error') return;
    this.stateValue.set('dirty');
    this.errorValue.set(undefined);
    void this.save();
  }

  discard(): void {
    this.clearDebounce();
    this.editVersion += 1;
    this.saveQueued = false;
    this.errorValue.set(undefined);
    this.draftValue.set(cloneAnalysis(this.committedValue()));
    this.stateValue.set(this.draftValue() ? 'saved' : 'idle');
  }

  async flush(): Promise<boolean> {
    this.clearDebounce();
    if (this.stateValue() === 'invalid' || this.stateValue() === 'error') return false;
    if (this.stateValue() === 'dirty') await this.save();
    return !this.isDirty() && !this.isBlocked();
  }

  private async save(): Promise<void> {
    this.clearDebounce();
    const draft = this.draftValue();
    const account = this.context.account();
    if (!draft || !account || this.stateValue() === 'invalid') return;
    if (this.saving) {
      this.saveQueued = true;
      return;
    }

    const submitted = cloneAnalysis(draft)!;
    const submittedVersion = this.editVersion;
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
          publication: {
            mode: 'patch',
            buildPatch: value => upsertWorkspaceRecords('facilityAnalyses', [value])
          }
        },
        () => this.analysisHandler.updateFacilityAnalysis(submitted, account.guid)
      );
      if (this.activeGuid !== submitted.guid) return;
      this.committedValue.set(cloneAnalysis(result.value));
      if (submittedVersion === this.editVersion) {
        this.draftValue.set(cloneAnalysis(result.value));
        this.stateValue.set('saved');
      } else {
        this.stateValue.set('dirty');
        this.saveQueued = true;
      }
    } catch (error) {
      if (this.activeGuid !== submitted.guid) return;
      this.stateValue.set('error');
      this.errorValue.set(error instanceof Error ? error.message : 'The analysis could not be saved.');
      this.saveQueued = false;
    } finally {
      this.saving = false;
      if (this.saveQueued && this.stateValue() !== 'error' && this.stateValue() !== 'invalid') {
        this.saveQueued = false;
        queueMicrotask(() => void this.save());
      }
    }
  }

  private reset(analysis: IdbAnalysisItem | undefined): void {
    this.clearDebounce();
    this.activeGuid = analysis?.guid ?? '';
    this.editVersion += 1;
    this.saving = false;
    this.saveQueued = false;
    this.errorValue.set(undefined);
    this.committedValue.set(cloneAnalysis(analysis));
    this.draftValue.set(cloneAnalysis(analysis));
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
