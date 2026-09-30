import { computed, inject, Injectable, signal } from '@angular/core';
import { ImportFileDraft } from '@data/import/spreadsheet-import.models';
import { ImportSessionService } from '../import-session.service';

@Injectable()
export class ImportWizardDraftStore {
  private readonly session = inject(ImportSessionService);
  private readonly activeDraftId = signal<string | undefined>(undefined);

  readonly draft = computed(() => {
    const id = this.activeDraftId();
    return id ? this.session.draft(id) : undefined;
  });

  initialize(draft: ImportFileDraft): void {
    if (!this.session.draft(draft.id)) this.session.addDrafts([draft]);
    this.activeDraftId.set(draft.id);
  }

  changed(): void {
    const id = this.activeDraftId();
    if (id) this.session.updateDraft(id, () => undefined);
  }
}
