import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IconName } from '@app/v1/shared/icons/icon-registry';
import { reportDefinition } from '@app/v1/reports/catalog/report-catalog';
import { reportIcon } from '@app/v1/reports/catalog/report-icons';

export interface AnalysisLinkedItem {
  readonly key: string;
  readonly name: string;
  readonly detail: string;
  readonly icon: IconName;
}

export function analysisLinkedReport(report: IdbAccountReport | IdbFacilityReport): AnalysisLinkedItem {
  const account = 'reportType' in report;
  const type = account ? report.reportType : report.facilityReportType;
  const label = reportDefinition(account ? 'account' : 'facility', type)?.label ?? 'Unknown report type';
  return {
    key: `${account ? 'account' : 'facility'}-report:${report.guid}`, name: report.name || 'Untitled report',
    detail: `${label} · ${account ? 'Account' : 'Facility'} report`, icon: reportIcon(report)
  };
}
