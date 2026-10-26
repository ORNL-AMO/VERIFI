import { accountReportAnalysisGuid } from '@data/account-workspace/account-report-setup.models';
export { accountReportAnalysisGuid } from '@data/account-workspace/account-report-setup.models';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { ReportType } from '@data/models/constantsAndTypes';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';
import { InventoryReportSnapshot, InventoryTile } from '@app/v1/shared/inventory/inventory.models';
import { FACILITY_REPORT_TYPES, ReportConfigurationStatus, buildFacilityReportCard } from '@app/v1/facility/reports/facility-report.models';
import { reportTypeAvailable } from './report-availability';
import { reportIcon } from './report-icons';
import { statusDestinationRoute } from '@app/v1/status/status-destination-route';

export const ACCOUNT_REPORT_TYPES: ReadonlyArray<{ value: ReportType; label: string }> = [
  { value: 'betterPlants', label: 'Better Plants' },
  { value: 'dataOverview', label: 'Data Overview' },
  { value: 'performance', label: 'Performance' },
  { value: 'betterClimate', label: 'Emissions' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'accountEmissionFactors', label: 'Emission Factors' },
  { value: 'accountSavings', label: 'Savings' }
];
export type ReportScope = 'account' | 'facility';
export type ReportInventoryEntry = ReportEntryView & (
  { readonly scope: 'account'; readonly report: IdbAccountReport } |
  { readonly scope: 'facility'; readonly facilityGuid: string; readonly report: IdbFacilityReport }
);
interface ReportEntryView {
  readonly key: string;
  readonly ownerName: string;
  readonly typeKey: string;
  readonly typeLabel: string;
  readonly status: ReportConfigurationStatus;
  readonly statusLabel: string;
  readonly modified: number;
  readonly searchText: string;
  readonly snapshot: InventoryReportSnapshot;
}
export interface ReportInventoryFilters {
  readonly search: string;
  readonly scope: 'all' | ReportScope;
  readonly type: string;
  readonly status: 'all' | ReportConfigurationStatus;
  readonly sort: 'account-first' | 'attention' | 'modified' | 'name';
}
export const DEFAULT_REPORT_FILTERS: ReportInventoryFilters = { search: '', scope: 'all', type: 'all', status: 'all', sort: 'account-first' };
export const REPORT_STATUS_LABELS: Record<ReportConfigurationStatus, string> = {
  ready: 'Setup ready', warning: 'Setup needs review', error: 'Setup incomplete', checking: 'Checking setup', unavailable: 'Setup status unavailable'
};

export function buildReportInventory(snapshot: AccountWorkspaceSnapshot, findings: readonly StatusItem[], evaluation: StatusEvaluationState): ReportInventoryEntry[] {
  const account = snapshot.account;
  const accountEntries = snapshot.accountReports.filter(report => report.accountId === account.guid && reportTypeAvailable(report.reportType, account.displayEmissions)).map(report => {
    const typeLabel = ACCOUNT_REPORT_TYPES.find(type => type.value === report.reportType)?.label ?? 'Unknown report type';
    const items = findings.filter(item => item.entity.kind === 'account-report' && item.entity.accountGuid === account.guid && item.entity.guid === report.guid);
    const status: ReportConfigurationStatus = evaluation === 'error' ? 'unavailable' : evaluation !== 'ready' ? 'checking'
      : !ACCOUNT_REPORT_TYPES.some(type => type.value === report.reportType) || items.some(item => item.severity === 'error') ? 'error'
      : items.some(item => item.severity === 'warning') ? 'warning' : 'ready';
    const analysisGuid = accountReportAnalysisGuid(report);
    const analysis = snapshot.accountAnalyses.find(item => item.accountId === account.guid && item.guid === analysisGuid);
    const facts = [{ label: 'Reporting period', value: accountReportPeriod(report) },
      ...(['betterPlants', 'performance', 'analysis', 'accountSavings'].includes(report.reportType)
        ? [{ label: 'Analysis', value: analysis?.name || (analysisGuid ? 'Linked analysis unavailable' : 'Not selected') }] : [])];
    let scope = 'Account-wide report';
    if (report.reportType === 'dataOverview') {
      const included = report.dataOverviewReportSetup?.includedFacilities?.filter(item => item.included) ?? [];
      scope = `${included.length} saved facility selection(s)`;
    } else if (report.reportType === 'betterClimate') {
      scope = `${report.betterClimateReportSetup?.includedFacilityGroups?.filter(item => item.include).length ?? 0} saved facility selection(s)`;
    } else if (analysisGuid) {
      const selections = analysis?.facilityAnalysisItems?.filter(item => !!item.analysisItemId && item.analysisItemId !== 'skip').length ?? 0;
      scope = analysis ? `${selections} saved facility analysis selection(s)` : 'Linked account analysis unavailable';
    }
    return { scope: 'account' as const, report, ...entryView('account', report, account.name || 'Account', typeLabel, report.reportType, status, facts, scope, items) };
  });
  const facilityEntries = snapshot.facilityReports.filter(report => report.accountId === account.guid && reportTypeAvailable(report.facilityReportType, account.displayEmissions)).flatMap(report => {
    const facility = snapshot.facilities.find(item => item.guid === report.facilityId && item.accountId === account.guid);
    if (!facility) return [];
    const card = buildFacilityReportCard(report, snapshot.facilityAnalyses, findings, evaluation);
    const typeLabel = FACILITY_REPORT_TYPES.find(type => type.value === report.facilityReportType)?.label ?? 'Unknown report type';
    const facts = card.view.factSections.flatMap(section => section.facts.map(fact => ({ label: fact.label, value: fact.valueLabel })));
    const items = findings.filter(item => item.entity.kind === 'facility-report' && item.entity.accountGuid === account.guid && item.entity.facilityGuid === facility.guid && item.entity.guid === report.guid);
    const scope = report.facilityReportType === 'overview'
      ? `${report.dataOverviewReportSettings?.includedGroups?.filter(item => item.include).length ?? 0} saved meter group selection(s)`
      : `Facility: ${facility.name || 'Unnamed facility'}`;
    return [{ scope: 'facility' as const, facilityGuid: facility.guid, report,
      ...entryView('facility', report, facility.name || 'Unnamed facility', typeLabel, report.facilityReportType, card.status, facts, scope, items) }];
  });
  return [...accountEntries, ...facilityEntries];
}

function entryView(scope: ReportScope, report: IdbAccountReport | IdbFacilityReport, owner: string, typeLabel: string, type: string,
  status: ReportConfigurationStatus, facts: readonly { label: string; value: string }[], scopeLabel: string, findings: readonly StatusItem[]): ReportEntryView {
  const timestamp = report.modifiedDate ? new Date(report.modifiedDate).getTime() : 0;
  const modified = Number.isFinite(timestamp) ? timestamp : 0;
  return {
    key: JSON.stringify([scope, scope === 'facility' ? (report as IdbFacilityReport).facilityId : report.accountId, report.guid]),
    ownerName: owner, typeKey: `${scope}:${type}`, typeLabel, status, statusLabel: REPORT_STATUS_LABELS[status], modified,
    searchText: [report.name, typeLabel, owner, ...facts.map(fact => fact.value), REPORT_STATUS_LABELS[status]].join(' ').toLocaleLowerCase(),
    snapshot: { scope, typeLabel, facts, scopeLabel, contentPending: scope !== 'account' || type !== 'betterPlants',
      modified: modified ? new Date(modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable',
      findings: findings.filter(item => item.severity !== 'information').map(item => {
        const route = statusDestinationRoute(item.destination);
        return { id: item.id, title: item.title, description: item.description, severity: item.severity === 'error' ? 'error' as const : 'warning' as const,
          action: route ? { label: item.actionLabel ?? 'Review', route } : undefined, unavailableReason: item.unavailableReason };
      }) }
  };
}
export function filterReportInventory(entries: readonly ReportInventoryEntry[], filters: ReportInventoryFilters): ReportInventoryEntry[] {
  const search = filters.search.trim().toLocaleLowerCase();
  const rank: Record<ReportConfigurationStatus, number> = { error: 0, warning: 1, unavailable: 2, checking: 3, ready: 4 };
  return entries.filter(entry => (!search || entry.searchText.includes(search)) && (filters.scope === 'all' || entry.scope === filters.scope)
    && (filters.type === 'all' || entry.typeKey === filters.type) && (filters.status === 'all' || entry.status === filters.status))
    .sort((a, b) => {
      const primary = filters.sort === 'account-first' ? Number(a.scope === 'facility') - Number(b.scope === 'facility') || rank[a.status] - rank[b.status]
        : filters.sort === 'attention' ? rank[a.status] - rank[b.status] : filters.sort === 'modified' ? b.modified - a.modified : 0;
      return primary || (a.report.name || '').localeCompare(b.report.name || '') || a.key.localeCompare(b.key);
    });
}
export function reportInventoryTile(entry: ReportInventoryEntry, navigation: WorkspaceNavigationService, showOwner = true): InventoryTile {
  return { guid: entry.key, name: entry.report.name || `Untitled ${entry.scope} report`, icon: reportIcon(entry.report),
    route: entry.scope === 'account' ? navigation.accountReportWorkbenchRoute(entry.report.accountId, entry.report.guid)
      : navigation.facilityReportWorkbenchRoute(entry.facilityGuid, entry.report.guid),
    owner: showOwner && entry.scope === 'facility' ? { label: entry.ownerName, route: navigation.facilityReportsRoute(entry.facilityGuid) } : undefined,
    chip: entry.typeLabel,
    status: { label: entry.statusLabel, tone: entry.status === 'ready' ? 'success' : entry.status === 'error' ? 'danger' : entry.status === 'warning' ? 'warning' : 'neutral',
      icon: entry.status === 'ready' ? 'success' : entry.status === 'checking' ? 'loading' : 'info' }, reportSnapshot: entry.snapshot };
}
function accountReportPeriod(report: IdbAccountReport): string {
  const year = (value: number) => Number.isFinite(value) ? String(value) : 'Not set';
  const month = (value: number, y: number) => Number.isInteger(value) && value >= 0 && value <= 11 && Number.isFinite(y)
    ? `${new Date(2000, value, 1).toLocaleString('en-US', { month: 'short' })} ${y}` : 'Not set';
  switch (report.reportType) {
    case 'dataOverview': return `${month(report.startMonth, report.startYear)} – ${month(report.endMonth, report.endYear)}`;
    case 'accountEmissionFactors': return `${year(report.startYear)} – ${year(report.endYear)}`;
    case 'accountSavings': return `Through ${month(report.endMonth, report.endYear)}`;
    case 'betterClimate': return `${year(report.baselineYear)} – ${year(report.reportYear)}`;
    default: return year(report.reportYear);
  }
}
