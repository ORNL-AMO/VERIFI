import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { FacilityReportType, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IconName } from '@app/v1/shared/icons/icon-registry';
import { ACCOUNT_REPORT_TYPES } from '@app/v1/shared/reports/report-inventory.models';
import { facilityReportTypeLabel } from '@app/v1/facility/reports/facility-report.models';
import { reportIcon } from '@app/v1/shared/reports/report-icons';

export interface AnalysisLinkedItem {
  readonly key: string;
  readonly name: string;
  readonly detail: string;
  readonly icon: IconName;
}

export function analysisLinkedReport(report: IdbAccountReport | IdbFacilityReport): AnalysisLinkedItem {
  const account = 'reportType' in report;
  const type = account ? report.reportType : report.facilityReportType;
  const label = account ? ACCOUNT_REPORT_TYPES.find(item => item.value === type)?.label ?? 'Unknown report type' : facilityReportTypeLabel(type as FacilityReportType);
  return {
    key: `${account ? 'account' : 'facility'}-report:${report.guid}`, name: report.name || 'Untitled report',
    detail: `${label} · ${account ? 'Account' : 'Facility'} report`, icon: reportIcon(report)
  };
}
