import { computed, inject, Injectable } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { buildAccountAnalysisCards } from './account-analysis.models';

@Injectable({ providedIn: 'root' })
export class AccountAnalysisWorkspaceService {
  private readonly store = inject(AccountWorkspaceStore);
  private readonly statusService = inject(WorkspaceStatusService);

  readonly account = this.store.account;
  readonly analyses = this.store.accountAnalyses;
  readonly facilities = this.store.facilities;
  readonly facilityAnalyses = this.store.facilityAnalyses;
  readonly reports = this.store.accountReports;
  readonly canWrite = this.store.canWrite;
  readonly hasPending = this.store.hasPending;
  readonly workspaceState = this.store.status;
  readonly workspaceError = this.store.error;
  readonly statusState = this.statusService.state;
  readonly cards = computed(() => buildAccountAnalysisCards({
    account: this.account(),
    analyses: this.analyses(),
    facilities: this.facilities(),
    facilityAnalyses: this.facilityAnalyses(),
    reports: this.reports(),
    statusItems: this.statusService.items(),
    statusState: this.statusState()
  }));
}
