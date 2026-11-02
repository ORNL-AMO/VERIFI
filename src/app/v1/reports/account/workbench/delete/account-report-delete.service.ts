import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountReportActionsService } from '../../account-report-actions.service';
import { AccountReportAutosaveService } from '../account-report-autosave.service';
import { AccountReportWorkbenchContext } from '../account-report-workbench-context.service';

@Injectable()
export class AccountReportDeleteService {
  private readonly context = inject(AccountReportWorkbenchContext);
  private readonly editor = inject(AccountReportAutosaveService);
  private readonly actions = inject(AccountReportActionsService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly deleting = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly candidate = signal<{ key: string; accountGuid: string; reportGuid: string; name: string } | undefined>(undefined);
  readonly canDelete = computed(() => !!this.context.report() && this.context.workspace.canWrite()
    && !this.context.workspace.hasPending() && !this.editor.saving() && !this.deleting());

  request(): void {
    const report = this.context.report();
    if (!report || !this.canDelete() || this.candidate()) return;
    this.editor.pauseAutosave(); this.error.set(undefined);
    this.candidate.set({ key: this.context.key(), accountGuid: report.accountId, reportGuid: report.guid, name: report.name || 'Untitled report' });
  }

  cancel(): void {
    if (this.deleting() || !this.candidate()) return;
    this.candidate.set(undefined); this.error.set(undefined);
    if (!this.destroy.destroyed) this.editor.resumeAutosave();
  }

  async confirm(): Promise<void> {
    const candidate = this.candidate();
    if (!candidate || !this.canDelete() || candidate.key !== this.context.key()) return;
    const current = () => !this.destroy.destroyed && candidate.key === this.context.key();
    this.deleting.set(true); this.error.set(undefined);
    try {
      await this.actions.delete(candidate.reportGuid);
      if (!current()) return;
      // Discard only after deletion commits; invalid or failed drafts remain intact on failure.
      this.editor.discard(); this.editor.resumeAutosave(); this.candidate.set(undefined);
      await this.router.navigate(this.context.navigation.accountReportsRoute(candidate.accountGuid));
    } catch (error) {
      if (current()) this.error.set(error instanceof Error ? error.message : 'The report could not be deleted. Try again.');
    } finally {
      if (!this.destroy.destroyed) this.deleting.set(false);
    }
  }
}
