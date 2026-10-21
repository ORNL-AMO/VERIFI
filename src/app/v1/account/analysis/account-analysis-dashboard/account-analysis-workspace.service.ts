import { computed, inject, Injectable } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { buildAccountAnalysisCards } from './account-analysis.models';
import { buildFacilityAnalysisCards } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis.models';
import { AnalysisInventoryEntry, analysisInventoryStatusLabel } from './analysis-inventory.models';
import { analysisCategories } from '@app/v1/shared/analysis-category/analysis-category-presentation';

@Injectable({ providedIn: 'root' })
export class AccountAnalysisWorkspaceService {
  private readonly store = inject(AccountWorkspaceStore);
  private readonly statusService = inject(WorkspaceStatusService);

  readonly account = this.store.account;
  readonly analyses = this.store.accountAnalyses;
  readonly facilities = this.store.facilities;
  readonly facilityAnalyses = this.store.facilityAnalyses;
  readonly meterGroups = this.store.meterGroups;
  readonly reports = this.store.accountReports;
  readonly canWrite = this.store.canWrite;
  readonly hasPending = this.store.hasPending;
  readonly workspaceState = this.store.status;
  readonly workspaceError = this.store.error;
  readonly statusState = this.statusService.state;
  readonly categories = computed(() => analysisCategories(this.store.meters(), [...this.analyses(), ...this.facilityAnalyses()]));
  readonly cards = computed(() => buildAccountAnalysisCards({
    account: this.account(),
    analyses: this.analyses(),
    facilities: this.facilities(),
    facilityAnalyses: this.facilityAnalyses(),
    reports: this.reports(),
    statusItems: this.statusService.items(),
    statusState: this.statusState()
  }));
  readonly entries = computed<readonly AnalysisInventoryEntry[]>(() => {
    const account = this.account();
    if (!account) return [];
    return [
      ...this.cards().map(card => ({ scope: 'account' as const, key: `account:${card.analysis.guid}`, ownerName: account.name || 'Account', card: { ...card, statusLabel: analysisInventoryStatusLabel(card.status, this.statusState()) } })),
      ...this.facilities().flatMap(facility => buildFacilityAnalysisCards({
        facility, analyses: this.facilityAnalyses().filter(item => item.facilityId === facility.guid),
        accountAnalyses: this.analyses(), reports: this.store.facilityReports().filter(item => item.facilityId === facility.guid),
        meterGroups: this.meterGroups().filter(item => item.facilityId === facility.guid),
        statusItems: this.statusService.items(), statusState: this.statusState()
      }).map(card => ({ scope: 'facility' as const, key: `facility:${card.analysis.guid}`, ownerName: facility.name || 'Facility', facility, card: { ...card, statusLabel: analysisInventoryStatusLabel(card.status, this.statusState()) } })))
    ];
  });
}
