import { Injectable, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { buildFacilityAnalysisCards } from './facility-analysis.models';

@Injectable({ providedIn: 'root' })
export class FacilityAnalysisWorkspaceService {
  private readonly store = inject(AccountWorkspaceStore);
  private readonly statusService = inject(WorkspaceStatusService);

  readonly account = this.store.account;
  readonly facility = this.store.selectedFacility;
  readonly analyses = this.store.selectedFacilityAnalyses;
  readonly meterGroups = this.store.facilityMeterGroups;
  readonly canWrite = this.store.canWrite;
  readonly hasPending = this.store.hasPending;
  readonly workspaceState = this.store.status;
  readonly workspaceError = this.store.error;
  readonly statusState = this.statusService.state;
  readonly cards = computed(() => buildFacilityAnalysisCards({
    analyses: this.analyses(),
    accountAnalyses: this.store.accountAnalyses(),
    reports: this.store.selectedFacilityReports(),
    meterGroups: this.meterGroups(),
    facility: this.facility(),
    statusItems: this.statusService.items(),
    statusState: this.statusState()
  }));
}
