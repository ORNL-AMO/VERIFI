import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityReportType, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';
import { ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { reportIcon } from '@app/v1/shared/reports/report-icons';

export const FACILITY_REPORT_TYPES: ReadonlyArray<{ value: FacilityReportType; label: string }> = [
  { value: 'analysis', label: 'Analysis' },
  { value: 'overview', label: 'Data Overview' },
  { value: 'emissionFactors', label: 'Emission Factors' },
  { value: 'savings', label: 'Savings' },
  { value: 'modeling', label: 'Modeling' },
  { value: 'costSavings', label: 'Cost Savings' },
  { value: 'dataQuality', label: 'Data Quality' }
];

export type ReportConfigurationStatus = 'ready' | 'warning' | 'error' | 'checking' | 'unavailable';
export interface FacilityReportCard {
  readonly report: IdbFacilityReport;
  readonly view: ResourceBrowseCardView;
  readonly status: ReportConfigurationStatus;
  readonly searchText: string;
  readonly modified: number;
}
export interface ReportFilters {
  readonly search: string;
  readonly type: 'all' | FacilityReportType;
  readonly status: 'all' | 'ready' | 'warning' | 'error';
  readonly sort: 'attention' | 'modified' | 'name';
}

export function facilityReportTypeLabel(type: FacilityReportType): string {
  return FACILITY_REPORT_TYPES.find(option => option.value === type)?.label ?? 'Unknown report type';
}

export function buildFacilityReportCard(
  report: IdbFacilityReport,
  analyses: readonly IdbAnalysisItem[],
  items: readonly StatusItem[],
  evaluation: StatusEvaluationState
): FacilityReportCard {
  const findings = items.filter(item => item.entity.kind === 'facility-report'
    && item.entity.guid === report.guid && item.entity.accountGuid === report.accountId
    && item.entity.facilityGuid === report.facilityId);
  const status: ReportConfigurationStatus = evaluation === 'error' ? 'unavailable'
    : evaluation !== 'ready' ? 'checking'
    : !FACILITY_REPORT_TYPES.some(option => option.value === report.facilityReportType)
      || findings.some(item => item.severity === 'error') ? 'error'
    : findings.some(item => item.severity === 'warning') ? 'warning' : 'ready';
  const labels: Record<ReportConfigurationStatus, string> = {
    ready: 'Setup ready', warning: 'Setup needs review', error: 'Setup incomplete',
    checking: 'Checking setup', unavailable: 'Setup status unavailable'
  };
  const tone = status === 'error' ? 'danger' : status === 'warning' ? 'warning'
    : status === 'ready' ? 'success' : 'info';
  const type = facilityReportTypeLabel(report.facilityReportType);
  const analysisGuid = report.facilityReportType === 'dataQuality'
    ? report.dataQualityReportSettings?.selectedMode === 'analysis'
      ? report.dataQualityReportSettings.selectedAnalysisItemId : undefined
    : report.analysisItemId;
  const analysis = analyses.find(item => item.guid === analysisGuid && item.facilityId === report.facilityId);
  const analysisLabel = analysis?.name || (analysisGuid ? 'Linked analysis unavailable' : 'Not selected');
  const period = reportPeriod(report);
  const modified = report.modifiedDate ? new Date(report.modifiedDate).getTime() : 0;
  const safeModified = Number.isFinite(modified) ? modified : 0;
  return {
    report, status, modified: safeModified,
    searchText: [report.name, type, analysis?.name, period].filter(Boolean).join(' ').toLocaleLowerCase(),
    view: {
      title: report.name || 'Untitled facility report', openLabel: `Open ${report.name || 'facility report'}`,
      icon: reportIcon(report), statusTone: tone,
      chips: [
        { id: 'type', label: type, tone: 'neutral' },
        { id: 'configuration', label: labels[status], tone, icon: status === 'checking' ? 'loading' : 'info', loading: status === 'checking' }
      ],
      factSections: [{ id: 'configuration', ariaLabel: 'Saved report configuration', facts: [
        ...(period !== undefined ? [{ id: 'period', label: 'Reporting period', valueLabel: period }] : []),
        ...(['analysis', 'savings', 'modeling', 'costSavings'].includes(report.facilityReportType) || analysisGuid
          ? [{ id: 'analysis', label: 'Analysis', valueLabel: analysisLabel }] : [])
      ] }],
      notes: [
        { id: 'migration', label: 'Report settings and preview are coming in a later migration.', icon: 'info', tone: 'info' },
        ...findings.slice(0, 2).map(item => ({ id: item.id, label: item.description, icon: 'warning' as const }))
      ],
      footerTag: { label: safeModified
        ? `Updated ${new Date(safeModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : 'Updated date unavailable', icon: 'info' }
    }
  };
}

export function filterFacilityReportCards(cards: readonly FacilityReportCard[], filters: ReportFilters): FacilityReportCard[] {
  const search = filters.search.trim().toLocaleLowerCase();
  const rank: Record<ReportConfigurationStatus, number> = { error: 0, warning: 1, unavailable: 2, checking: 3, ready: 4 };
  return cards.filter(card => (!search || card.searchText.includes(search))
    && (filters.type === 'all' || card.report.facilityReportType === filters.type)
    && (filters.status === 'all' || card.status === filters.status))
    .sort((first, second) => {
      const primary = filters.sort === 'attention' ? rank[first.status] - rank[second.status]
        : filters.sort === 'modified' ? second.modified - first.modified : 0;
      return primary || first.view.title.localeCompare(second.view.title) || first.report.guid.localeCompare(second.report.guid);
    });
}

function reportPeriod(report: IdbFacilityReport): string | undefined {
  const year = (value: number | undefined) => value == null ? 'Not set' : String(value);
  const monthYear = (month: number | undefined, value: number | undefined) =>
    month == null || value == null ? 'Not set'
      : `${new Date(2000, month, 1).toLocaleString('en-US', { month: 'short' })} ${value}`;
  switch (report.facilityReportType) {
    case 'analysis': return year(report.analysisReportSettings?.reportYear);
    case 'modeling': return year(report.modelingReportSettings?.reportYear);
    case 'savings': return `Through ${monthYear(report.savingsReportSettings?.endMonth, report.savingsReportSettings?.endYear)}`;
    case 'costSavings': return `Through ${monthYear(report.costSavingsReportSettings?.endMonth, report.costSavingsReportSettings?.endYear)}`;
    case 'emissionFactors': return `${year(report.emissionFactorsReportSettings?.startYear)} – ${year(report.emissionFactorsReportSettings?.endYear)}`;
    case 'overview': return `${monthYear(report.dataOverviewReportSettings?.startMonth, report.dataOverviewReportSettings?.startYear)} – ${monthYear(report.dataOverviewReportSettings?.endMonth, report.dataOverviewReportSettings?.endYear)}`;
    default: return undefined;
  }
}
