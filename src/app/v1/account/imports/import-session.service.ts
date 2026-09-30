import { Injectable, computed, signal } from '@angular/core';
import { ImportCommitSummary, ImportFileDraft, ImportOriginContext } from '@data/import/spreadsheet-import.models';

@Injectable({ providedIn: 'root' })
export class ImportSessionService {
  private readonly draftsState = signal<ImportFileDraft[]>([]);
  private readonly originState = signal<ImportOriginContext>({});
  private readonly pendingState = signal(false);
  private readonly summariesState = signal<Readonly<Record<string, ImportCommitSummary>>>({});

  readonly drafts = this.draftsState.asReadonly();
  readonly origin = this.originState.asReadonly();
  readonly pending = this.pendingState.asReadonly();
  readonly hasUnsavedChanges = computed(() => this.draftsState().some(draft => draft.status !== 'completed'));

  begin(origin: ImportOriginContext): void {
    if (!this.draftsState().length) this.originState.set(origin);
  }

  addDrafts(drafts: ImportFileDraft[]): void {
    this.draftsState.update(current => [...current, ...drafts]);
  }

  draft(id: string): ImportFileDraft | undefined {
    return this.draftsState().find(draft => draft.id === id);
  }

  updateDraft(id: string, update: (draft: ImportFileDraft) => void): void {
    this.draftsState.update(drafts => drafts.map(draft => {
      if (draft.id !== id) return draft;
      update(draft);
      return { ...draft };
    }));
  }

  summary(draftId: string): ImportCommitSummary | undefined {
    return this.summariesState()[draftId];
  }

  setPending(pending: boolean): void {
    this.pendingState.set(pending);
  }

  complete(draftId: string, summary: ImportCommitSummary): void {
    this.updateDraft(draftId, draft => {
      draft.status = 'completed';
      draft.dataSubmitted = true;
    });
    this.summariesState.update(summaries => ({ ...summaries, [draftId]: summary }));
  }

  nextReady(excludingId?: string): ImportFileDraft | undefined {
    return this.draftsState().find(draft => draft.id !== excludingId && draft.status === 'ready');
  }

  clear(): void {
    this.draftsState.set([]);
    this.summariesState.set({});
    this.originState.set({});
  }
}
