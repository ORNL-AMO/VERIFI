import { Injectable, computed, signal } from '@angular/core';
import { ImportCommitSummary, ImportFileDraft, ImportOriginContext } from '@data/import/spreadsheet-import.models';

@Injectable({ providedIn: 'root' })
export class ImportSessionService {
  private readonly draftsState = signal<ImportFileDraft[]>([]);
  private readonly originState = signal<ImportOriginContext>({});
  private readonly pendingState = signal(false);
  private readonly summaryState = signal<ImportCommitSummary | undefined>(undefined);

  readonly drafts = this.draftsState.asReadonly();
  readonly origin = this.originState.asReadonly();
  readonly pending = this.pendingState.asReadonly();
  readonly summary = this.summaryState.asReadonly();
  readonly hasUnsavedChanges = computed(() => this.draftsState().some(draft => draft.status !== 'completed'));

  setOrigin(origin: ImportOriginContext): void {
    this.originState.set(origin);
  }

  addDrafts(drafts: ImportFileDraft[]): void {
    this.draftsState.update(current => [...current, ...drafts]);
  }

  draft(id: string): ImportFileDraft | undefined {
    return this.draftsState().find(draft => draft.id === id);
  }

  notifyChanged(): void {
    this.draftsState.update(drafts => [...drafts]);
  }

  setPending(pending: boolean): void {
    this.pendingState.set(pending);
  }

  complete(draftId: string, summary: ImportCommitSummary): void {
    const draft = this.draft(draftId);
    if (draft) {
      draft.status = 'completed';
      draft.dataSubmitted = true;
    }
    this.summaryState.set(summary);
    this.notifyChanged();
  }

  nextReady(excludingId?: string): ImportFileDraft | undefined {
    return this.draftsState().find(draft => draft.id !== excludingId && draft.status === 'ready');
  }

  clear(): void {
    this.draftsState.set([]);
    this.summaryState.set(undefined);
    this.originState.set({});
  }
}
