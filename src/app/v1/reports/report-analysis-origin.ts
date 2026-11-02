import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { accountReportAnalysisSetupKey } from '@data/account-workspace/account-report-setup.models';
import { reportTypeAvailable } from './report-availability';

export const REPORT_ANALYSIS_ORIGIN_QUERY = {
  accountGuid: 'returnReportAccountGuid',
  reportGuid: 'returnReportGuid'
} as const;

export interface ReportAnalysisOrigin {
  readonly accountGuid: string;
  readonly reportGuid: string;
}

/** GUID identities only; return destinations are always built from canonical routes. */
export function readReportAnalysisOrigin(params: { get(name: string): string | null }): ReportAnalysisOrigin | undefined {
  const accountGuid = params.get(REPORT_ANALYSIS_ORIGIN_QUERY.accountGuid)?.trim();
  const reportGuid = params.get(REPORT_ANALYSIS_ORIGIN_QUERY.reportGuid)?.trim();
  return accountGuid && reportGuid ? { accountGuid, reportGuid } : undefined;
}

export function resolveReportAnalysisOrigin(origin: ReportAnalysisOrigin | undefined, snapshot: AccountWorkspaceSnapshot | undefined): ReportAnalysisOrigin | undefined {
  if (!origin || snapshot?.account.guid !== origin.accountGuid) return undefined;
  const report = snapshot.accountReports.find(item => item.guid === origin.reportGuid && item.accountId === origin.accountGuid);
  return report && accountReportAnalysisSetupKey(report.reportType) && reportTypeAvailable(report.reportType, snapshot.account.displayEmissions)
    ? origin : undefined;
}
