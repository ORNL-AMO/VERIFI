import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityReportType, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';
import { reportDefinition } from '@app/v1/reports/catalog/report-catalog';
import type { ReportConfigurationStatus } from '@app/v1/reports/shared/report.models';
export interface FacilityReportPresentation {
  readonly typeLabel: string;
  readonly status: ReportConfigurationStatus;
  readonly facts: readonly { readonly label: string; readonly value: string }[];
}
export function facilityReportTypeLabel(type: FacilityReportType): string {
  return reportDefinition('facility', type)?.label ?? 'Unknown report type';
}

export function buildFacilityReportPresentation(
  report: IdbFacilityReport,
  analyses: readonly IdbAnalysisItem[],
  items: readonly StatusItem[],
  evaluation: StatusEvaluationState
): FacilityReportPresentation {
  const findings = items.filter(item => item.entity.kind === 'facility-report'
    && item.entity.guid === report.guid && item.entity.accountGuid === report.accountId
    && item.entity.facilityGuid === report.facilityId);
  const status: ReportConfigurationStatus = evaluation === 'error' ? 'unavailable'
    : evaluation !== 'ready' ? 'checking'
    : !reportDefinition('facility', report.facilityReportType)
      || findings.some(item => item.severity === 'error') ? 'error'
    : findings.some(item => item.severity === 'warning') ? 'warning' : 'ready';
  const analysisGuid = report.facilityReportType === 'dataQuality'
    ? report.dataQualityReportSettings?.selectedMode === 'analysis'
      ? report.dataQualityReportSettings.selectedAnalysisItemId : undefined
    : report.analysisItemId;
  const analysis = analyses.find(item => item.guid === analysisGuid && item.facilityId === report.facilityId);
  const analysisLabel = analysis?.name || (analysisGuid ? 'Linked analysis unavailable' : 'Not selected');
  const period = reportPeriod(report);
  return {
    typeLabel: facilityReportTypeLabel(report.facilityReportType),
    status,
    facts: [
      ...(period !== undefined ? [{ label: 'Reporting period', value: period }] : []),
      ...(['analysis', 'savings', 'modeling', 'costSavings'].includes(report.facilityReportType) || analysisGuid
        ? [{ label: 'Analysis', value: analysisLabel }] : [])
    ]
  };
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
