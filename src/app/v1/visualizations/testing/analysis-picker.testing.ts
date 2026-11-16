import { buildAccountAnalysisCards } from '@app/v1/analysis/account/account-analysis.models';
import { computed, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnalysisInventoryWorkspaceService } from '@app/v1/analysis/inventory/analysis-inventory-workspace.service';
import { buildFacilityAnalysisCards } from '@app/v1/analysis/facility/facility-analysis.models';
import type { AnalysisInventoryEntry } from '@app/v1/analysis/inventory/analysis-inventory.models';

/** Real saved-card projection, without unrelated validation/database infrastructure in UI-only tests. */
export function analysisPickerTestProvider() {
  return { provide: AnalysisInventoryWorkspaceService, deps: [AccountWorkspaceStore], useFactory: (workspace: AccountWorkspaceStore) => ({
    statusState: signal('evaluating'), statusItems: signal([]), facilityInputs: () => ({ meterGroups: workspace.meterGroups(), meters: workspace.meters(), meterData: workspace.meterData(), predictorData: workspace.predictorData() }), meterGroups: workspace.meterGroups,
    entries: computed<readonly AnalysisInventoryEntry[]>(() => [...buildAccountAnalysisCards({ account: workspace.account(), analyses: workspace.accountAnalyses(), facilities: workspace.facilities(), facilityAnalyses: workspace.facilityAnalyses(), reports: workspace.accountReports(), statusItems: [], statusState: 'evaluating' }).map(card => ({ scope: 'account' as const, key: `account:${card.analysis.guid}`, ownerName: 'Account', card })), ...workspace.facilities().flatMap(facility => buildFacilityAnalysisCards({
      facility, analyses: workspace.facilityAnalyses().filter(analysis => analysis.facilityId === facility.guid),
      accountAnalyses: workspace.accountAnalyses(), reports: workspace.facilityReports(), meterGroups: workspace.meterGroups(), statusItems: [], statusState: 'evaluating'
    }).map(card => ({ scope: 'facility' as const, key: `facility:${card.analysis.guid}`, ownerName: facility.name, facility, card })))])
  }) };
}
