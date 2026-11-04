import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { reportTypeAvailable } from '../../catalog/report-availability';
import { reportDefinition } from '@app/v1/reports/catalog/report-catalog';

export const REPORT_ANALYSIS_ORIGIN_QUERY = {
  accountGuid: 'returnReportAccountGuid',
  reportGuid: 'returnReportGuid',
  scope: 'returnReportScope', facilityGuid: 'returnReportFacilityGuid'
} as const;

export interface ReportAnalysisOrigin {
  readonly accountGuid: string;
  readonly reportGuid: string;
  readonly scope?: 'facility';
  readonly facilityGuid?: string;
}

/** GUID identities only; return destinations are always built from canonical routes. */
export function readReportAnalysisOrigin(params: { get(name: string): string | null }): ReportAnalysisOrigin | undefined {
  const accountGuid = params.get(REPORT_ANALYSIS_ORIGIN_QUERY.accountGuid)?.trim();
  const reportGuid = params.get(REPORT_ANALYSIS_ORIGIN_QUERY.reportGuid)?.trim();
  const scope = params.get(REPORT_ANALYSIS_ORIGIN_QUERY.scope);
  const facilityGuid = params.get(REPORT_ANALYSIS_ORIGIN_QUERY.facilityGuid)?.trim();
  if (scope && scope !== 'facility') return undefined;
  if (scope === 'facility' && !facilityGuid) return undefined;
  return accountGuid && reportGuid ? { accountGuid, reportGuid, ...(scope === 'facility' ? { scope, facilityGuid } : {}) } : undefined;
}

export function resolveReportAnalysisOrigin(origin: ReportAnalysisOrigin | undefined, snapshot: AccountWorkspaceSnapshot | undefined): ReportAnalysisOrigin | undefined {
  if (!origin || snapshot?.account.guid !== origin.accountGuid) return undefined;
  if (origin.scope === 'facility') {
    const facility = snapshot.facilities.find(item => item.accountId === origin.accountGuid && item.guid === origin.facilityGuid);
    const report = snapshot.facilityReports.find(item => item.accountId === origin.accountGuid
      && item.facilityId === facility?.guid && item.guid === origin.reportGuid
      && reportDefinition('facility', item.facilityReportType)?.supportsAnalysisReturn
      && reportTypeAvailable('facility', item.facilityReportType, snapshot.account.displayEmissions));
    return facility && report ? origin : undefined;
  }
  const report = snapshot.accountReports.find(item => item.guid === origin.reportGuid && item.accountId === origin.accountGuid);
  return report && reportDefinition('account', report.reportType)?.supportsAnalysisReturn && reportTypeAvailable('account', report.reportType, snapshot.account.displayEmissions)
    ? origin : undefined;
}
