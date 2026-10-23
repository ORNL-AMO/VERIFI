import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { accountReportAnalysisGuid, accountReportAnalysisSetupKey } from '@data/account-workspace/account-report-setup.models';
import { ACCOUNT_REPORT_TYPES } from '@app/v1/shared/reports/report-inventory.models';
import { FACILITY_REPORT_TYPES } from '@app/v1/facility/reports/facility-report.models';
import { reportTypeAvailable } from '@app/v1/shared/reports/report-availability';
import { StatusDestination, StatusEntityRef, StatusItem } from './status.models';

export function isReportStatusItem(item: StatusItem): boolean {
  return item.entity.kind === 'account-report' || item.entity.kind === 'facility-report';
}

/** Retain only the origin identity in browser history; guards revalidate the saved link. */
export function reportStatusNavigationState(item: StatusItem): { reportStatusSource: StatusEntityRef } | undefined {
  return isReportStatusItem(item) && item.code === 'report.analysis.warning' && item.destination.kind === 'facility-analysis'
    ? { reportStatusSource: item.entity } : undefined;
}

export function reportStatusNavigationSource(state: Record<string, unknown> | undefined): StatusEntityRef | undefined {
  const source = state?.['reportStatusSource'] as Partial<StatusEntityRef> | undefined;
  return source && (source.kind === 'account-report' || source.kind === 'facility-report')
    && typeof source.guid === 'string' && typeof source.accountGuid === 'string' && typeof source.name === 'string'
    && (source.kind !== 'facility-report' || typeof source.facilityGuid === 'string') ? source as StatusEntityRef : undefined;
}

/** Presentation only: resolve existing records without repairing references or writing pairs. */
export function resolveReportStatusItem(item: StatusItem, snapshot: AccountWorkspaceSnapshot | undefined): StatusItem {
  if (!isReportStatusItem(item)) return item;
  const unavailable = (reason: string): StatusItem => ({ ...item, destination: { kind: 'unavailable' }, actionLabel: undefined, unavailableReason: reason });
  if (!snapshot || snapshot.account.guid !== item.entity.accountGuid) return unavailable('This report is no longer available in this workspace.');
  const accountGuid = snapshot.account.guid;
  const accountReport = item.entity.kind === 'account-report'
    ? snapshot.accountReports.find(report => report.accountId === accountGuid && report.guid === item.entity.guid) : undefined;
  const facilityReport = item.entity.kind === 'facility-report'
    ? snapshot.facilityReports.find(report => report.accountId === accountGuid && report.facilityId === item.entity.facilityGuid && report.guid === item.entity.guid) : undefined;
  const facility = facilityReport && snapshot.facilities.find(owner => owner.accountId === accountGuid && owner.guid === facilityReport.facilityId);
  if ((!accountReport && !facilityReport) || (facilityReport && !facility)) return unavailable('This report is no longer available in this workspace.');
  if ((accountReport && !ACCOUNT_REPORT_TYPES.some(type => type.value === accountReport.reportType))
    || (facilityReport && !FACILITY_REPORT_TYPES.some(type => type.value === facilityReport.facilityReportType))) {
    return unavailable('This report type is not supported in v1.');
  }
  const type = accountReport?.reportType ?? facilityReport!.facilityReportType;
  if (!reportTypeAvailable(type, snapshot.account.displayEmissions)) return unavailable('Enable Other Impacts in Account Goals to access this report.');
  const setup: StatusDestination = accountReport
    ? { kind: 'account-report-setup', accountGuid, reportGuid: accountReport.guid }
    : { kind: 'facility-report-setup', accountGuid, facilityGuid: facility!.guid, reportGuid: facilityReport!.guid };
  const available = (destination: StatusDestination, actionLabel: string): StatusItem => ({ ...item, destination, actionLabel, unavailableReason: undefined });
  switch (item.code) {
    case 'report.configuration.invalid': {
      const reasons = item.evidence['reasons'];
      if (Array.isArray(reasons) && reasons.includes('missingName')) {
        const result = available(setup, 'Review name');
        return reasons.some(reason => reason !== 'missingName') && !item.description.endsWith('Other report settings are pending migration.')
          ? { ...result, description: `${item.description} Other report settings are pending migration.` } : result;
      }
      return unavailable('These report settings are pending migration.');
    }
    case 'report.analysis.invalid':
      return accountReport && accountReportAnalysisSetupKey(accountReport.reportType)
        ? available(setup, 'Review analysis') : unavailable('Report analysis selection is pending migration.');
    case 'report.analysis.warning': {
      let destination: StatusDestination | undefined;
      if (accountReport) {
        const linked = snapshot.accountAnalyses.find(analysis => analysis.accountId === accountGuid && analysis.guid === accountReportAnalysisGuid(accountReport));
        if (linked && ['energy', 'water'].includes(linked.analysisCategory)) {
          const facilities = snapshot.facilities.filter(owner => owner.accountId === accountGuid);
          if (snapshot.account.isSingleFacilityCompany === true) {
            const link = linked.facilityAnalysisItems?.length === 1 ? linked.facilityAnalysisItems[0] : undefined;
            const analysis = facilities.length === 1 && link?.facilityId === facilities[0].guid && link.analysisItemId && link.analysisItemId !== 'skip'
              ? snapshot.facilityAnalyses.find(analysis => analysis.accountId === accountGuid && analysis.facilityId === link.facilityId
                && analysis.guid === link.analysisItemId && ['energy', 'water'].includes(analysis.analysisCategory)) : undefined;
            if (analysis) destination = { kind: 'facility-analysis', facilityGuid: analysis.facilityId, analysisGuid: analysis.guid, scope: 'analysis', tab: 'setup' };
          } else destination = { kind: 'account-analysis', accountGuid, analysisGuid: linked.guid };
        }
      } else if (facilityReport && ['analysis', 'savings', 'modeling', 'costSavings'].includes(facilityReport.facilityReportType)) {
        const analysis = snapshot.facilityAnalyses.find(analysis => analysis.accountId === accountGuid && analysis.facilityId === facility!.guid
          && analysis.guid === facilityReport.analysisItemId && ['energy', 'water'].includes(analysis.analysisCategory));
        if (analysis) destination = { kind: 'facility-analysis', facilityGuid: analysis.facilityId, analysisGuid: analysis.guid, scope: 'analysis', tab: 'setup' };
      }
      return destination ? available(destination, 'Review linked analysis') : unavailable('The linked analysis is unavailable in this workspace.');
    }
    case 'report.dates.invalid': return unavailable('Report date settings are pending migration.');
    case 'report.data.incomplete': return unavailable('Report data selection is pending migration.');
    default: return unavailable('Fix workflow not yet available in v1');
  }
}
