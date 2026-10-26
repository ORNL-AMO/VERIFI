import type { ReportType } from '@data/models/constantsAndTypes';
import type { FacilityReportType } from '@data/models/idbModels/facilityReport';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

const ACCOUNT_REPORT_ICONS: Readonly<Partial<Record<ReportType, IconName>>> = {
  betterPlants: 'betterPlantsReport'
};
const FACILITY_REPORT_ICONS: Readonly<Partial<Record<FacilityReportType, IconName>>> = {};

/** Report identity is presentation metadata, never a saved report setting. */
export function reportIcon(report?: { readonly reportType: ReportType } | { readonly facilityReportType: FacilityReportType }): IconName {
  if (!report) return 'report';
  const account = 'reportType' in report;
  const type = account ? report.reportType : report.facilityReportType;
  const icons: Readonly<Partial<Record<string, IconName>>> = account ? ACCOUNT_REPORT_ICONS : FACILITY_REPORT_ICONS;
  return Object.hasOwn(icons, type) ? icons[type] ?? 'report' : 'report';
}
