import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AnalysisUsageSource, facilityReportAnalysisGuid } from '@data/account-workspace/analysis-usage.models';
import { accountReportReferencesAnalysis } from '@data/models/idbModels/accountReport';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { singleFacilityAnalysisPairCandidates } from '@data/account-workspace/single-facility-analysis-pairs';
import { AnalysisLinkedItem, analysisLinkedReport } from '@app/v1/shared/analysis-results/linked-items/analysis-linked-items.models';
import { accountAnalysisWorkbenchRoute, accountReportWorkbenchRoute, facilityAnalysisWorkbenchRoute,
  facilityReportWorkbenchRoute, visualizationWorkbenchRoute } from '@app/v1/routing/workspace-route';
import { visualizationChartIcon } from '@app/v1/visualizations/visualization-charts';

export interface AnalysisUsageCard extends AnalysisLinkedItem {
  readonly route: readonly string[];
  readonly queryParams?: Readonly<Record<string, string>>;
}

/** Informational projection only: no result demand, pair repair, or selection writes. */
export function buildAnalysisUsageView(snapshot: AccountWorkspaceSnapshot | undefined, source: AnalysisUsageSource | undefined): {
  consumers: readonly AnalysisUsageCard[]; bankingSource?: AnalysisUsageCard;
} {
  if (!snapshot || !source || source.accountGuid !== snapshot.account.guid) return { consumers: [] };
  const cards: AnalysisUsageCard[] = [];
  const ownedFacilities = snapshot.facilities.filter(item => item.accountId === source.accountGuid);
  const singleFacility = snapshot.account.isSingleFacilityCompany === true && ownedFacilities.length === 1;
  const accountAnalyses = snapshot.accountAnalyses.filter(item => item.accountId === source.accountGuid);
  const referencedAccountGuids = new Set(source.scope === 'account' ? [source.analysisGuid]
    : singleFacility ? singleFacilityAnalysisPairCandidates(accountAnalyses, source.facilityGuid, source.analysisGuid).map(item => item.guid) : []);
  for (const report of snapshot.accountReports) {
    if (report.accountId === source.accountGuid && [...referencedAccountGuids].some(guid => accountReportReferencesAnalysis(report, guid))) {
      cards.push({ ...analysisLinkedReport(report), route: accountReportWorkbenchRoute(report.accountId, report.guid) });
    }
  }
  let bankingSource: AnalysisUsageCard | undefined;
  if (source.scope === 'facility' && ownedFacilities.some(item => item.guid === source.facilityGuid)) {
    if (!singleFacility) for (const analysis of accountAnalyses) {
      if (analysis.facilityAnalysisItems?.some(link => link.facilityId === source.facilityGuid && link.analysisItemId === source.analysisGuid)) {
        cards.push({ key: `account-analysis:${analysis.guid}`, name: analysis.name || 'Untitled account analysis', detail: 'Account analysis',
          icon: 'accountAnalysis', route: accountAnalysisWorkbenchRoute(source.accountGuid, analysis.guid) });
      }
    }
    for (const report of snapshot.facilityReports) {
      if (report.accountId === source.accountGuid && report.facilityId === source.facilityGuid && facilityReportAnalysisGuid(report) === source.analysisGuid) {
        cards.push({ ...analysisLinkedReport(report), route: facilityReportWorkbenchRoute(source.facilityGuid, report.guid) });
      }
    }
    const analyses = snapshot.facilityAnalyses.filter(item => item.accountId === source.accountGuid && item.facilityId === source.facilityGuid);
    const current = analyses.find(item => item.guid === source.analysisGuid);
    for (const analysis of analyses) {
      const card: AnalysisUsageCard = { key: `facility-analysis:${analysis.guid}`, name: analysis.name || 'Untitled facility analysis',
        detail: 'Banking consumer', icon: 'analysis', route: facilityAnalysisWorkbenchRoute(source.facilityGuid, analysis.guid) };
      if (analysis.bankedAnalysisItemId === source.analysisGuid && analysis.guid !== source.analysisGuid) cards.push(card);
      if (current?.bankedAnalysisItemId === analysis.guid) bankingSource = { ...card, detail: 'Supplies banked savings to this analysis' };
    }
  }
  const analysisGuids = new Set([source.analysisGuid, ...referencedAccountGuids]);
  for (const record of snapshot.savedVisualizations) {
    if (record.accountId !== source.accountGuid) continue;
    const read = readSavedVisualization(record);
    if (!('definition' in read) || read.definition.accountGuid !== source.accountGuid) continue;
    if (read.definition.sources.some(item => item.kind === 'analysis' && item.analysisGuid && analysisGuids.has(item.analysisGuid))) {
      cards.push({ key: `visualization:${record.guid}`, name: read.definition.name || 'Untitled visualization', detail: 'Saved visualization',
        icon: visualizationChartIcon(read.definition.chart), route: visualizationWorkbenchRoute(source.accountGuid, record.guid) });
    }
  }
  return { consumers: [...new Map(cards.map(item => [item.key, item])).values()], bankingSource };
}
