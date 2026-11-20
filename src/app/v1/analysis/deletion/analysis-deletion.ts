import { facilityReportAnalysisGuid } from '@data/account-workspace/analysis-usage.models';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { singleFacilityAnalysisPairCandidates } from '@data/account-workspace/single-facility-analysis-pairs';
import { accountReportReferencesAnalysis } from '@data/models/idbModels/accountReport';

export type AnalysisDeletionScope = 'account' | 'facility';

export interface AnalysisDeletionPreview {
  readonly scope: AnalysisDeletionScope;
  readonly accountGuid: string;
  readonly analysisGuid: string;
  readonly facilityGuid?: string;
  readonly analysisName: string;
  readonly ownerName: string;
  readonly clearsActiveSelection: boolean;
  readonly linkedAccountAnalyses: readonly { readonly guid: string; readonly name: string }[];
  readonly pairedAccountAnalysisCount: number;
  readonly blockedReason: string;
}

/** Shared presentation of the existing transaction guards; persistence always rechecks them. */
export function analysisDeletionBlockedReason(
  scope: AnalysisDeletionScope,
  reportCount: number,
  bankingConsumerCount = 0,
  pairedReportCount = 0
): string {
  if (reportCount) return `Remove this analysis from ${reportCount} linked ${scope} report(s) before deleting it.`;
  if (bankingConsumerCount) return `Remove this analysis from ${bankingConsumerCount} banking workflow(s) before deleting it.`;
  if (pairedReportCount) return `Remove the paired account analysis from ${pairedReportCount} linked account report(s) before deleting it.`;
  return '';
}

export function analysisDeletionPreview(
  snapshot: AccountWorkspaceSnapshot | undefined,
  scope: AnalysisDeletionScope,
  analysisGuid: string
): AnalysisDeletionPreview | undefined {
  if (!snapshot) return undefined;
  const account = snapshot.account;
  if (scope === 'account') {
    const analysis = snapshot.accountAnalyses.find(item => item.guid === analysisGuid && item.accountId === account.guid);
    if (!analysis) return undefined;
    return {
      scope, accountGuid: account.guid, analysisGuid, analysisName: analysis.name || 'Untitled analysis',
      ownerName: account.name || 'Account',
      clearsActiveSelection: account.selectedEnergyAnalysisId === analysisGuid || account.selectedWaterAnalysisId === analysisGuid,
      linkedAccountAnalyses: [], pairedAccountAnalysisCount: 0,
      blockedReason: analysisDeletionBlockedReason(scope,
        snapshot.accountReports.filter(report => accountReportReferencesAnalysis(report, analysisGuid)).length)
    };
  }
  const analysis = snapshot.facilityAnalyses.find(item => item.guid === analysisGuid && item.accountId === account.guid);
  const facility = snapshot.facilities.find(item => item.guid === analysis?.facilityId && item.accountId === account.guid);
  if (!analysis || !facility) return undefined;
  const pairs = account.isSingleFacilityCompany === true && snapshot.facilities.length === 1
    ? singleFacilityAnalysisPairCandidates(snapshot.accountAnalyses, facility.guid, analysisGuid) : [];
  return {
    scope, accountGuid: account.guid, analysisGuid, facilityGuid: facility.guid,
    analysisName: analysis.name || 'Untitled analysis', ownerName: facility.name || 'Facility',
    clearsActiveSelection: facility.selectedEnergyAnalysisId === analysisGuid || facility.selectedWaterAnalysisId === analysisGuid
      || pairs.some(pair => account.selectedEnergyAnalysisId === pair.guid || account.selectedWaterAnalysisId === pair.guid),
    linkedAccountAnalyses: snapshot.accountAnalyses.filter(item => !pairs.some(pair => pair.guid === item.guid)
      && item.facilityAnalysisItems?.some(link => link.facilityId === facility.guid && link.analysisItemId === analysisGuid)),
    pairedAccountAnalysisCount: pairs.length,
    blockedReason: analysisDeletionBlockedReason(scope,
      snapshot.facilityReports.filter(report => facilityReportAnalysisGuid(report) === analysisGuid).length,
      snapshot.facilityAnalyses.filter(item => item.guid !== analysisGuid && item.bankedAnalysisItemId === analysisGuid).length,
      snapshot.accountReports.filter(report => pairs.some(pair => accountReportReferencesAnalysis(report, pair.guid))).length)
  };
}
