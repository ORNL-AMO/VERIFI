import type { ReportType } from '@data/models/constantsAndTypes';
import type { FacilityReportType } from '@data/models/idbModels/facilityReport';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { reportDefinition } from './report-catalog';

/** Report identity is presentation metadata, never a saved report setting. */
export function reportIcon(report?: { readonly reportType: ReportType } | { readonly facilityReportType: FacilityReportType }): IconName {
  if (!report) return 'report';
  return ('reportType' in report ? reportDefinition('account', report.reportType) : reportDefinition('facility', report.facilityReportType))?.icon ?? 'report';
}
