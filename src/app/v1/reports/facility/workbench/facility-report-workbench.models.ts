import { facilityReportTypeLabel } from '../facility-report.models';
import type { ReportConfigurationStatus } from '@app/v1/reports/shared/report.models';
import { reportDefinition } from '@app/v1/reports/catalog/report-catalog';
import type { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { buildReportStages, reportStage, ReportStageId, ReportWorkbenchStage } from '@app/v1/reports/shared/workbench/report-workbench.models';
import { reportIcon } from '@app/v1/reports/catalog/report-icons';

export type FacilityReportStageId = ReportStageId;
export type FacilityReportStage = ReportWorkbenchStage;

export function hasFacilityReportDataChecks(report: IdbFacilityReport): boolean {
  return reportDefinition('facility', report.facilityReportType)?.hasDataChecks ?? false;
}

export function facilityReportStage(value?: string): FacilityReportStageId {
  return reportStage(value);
}

export function buildFacilityReportStages(report: IdbFacilityReport, current: FacilityReportStageId, status: ReportConfigurationStatus = 'checking'): readonly FacilityReportStage[] {
  const route = ['/v1', 'workspace', 'facility', report.facilityId, 'reports', 'workbench', report.guid];
  return buildReportStages(route, facilityReportTypeLabel(report.facilityReportType), current, hasFacilityReportDataChecks(report), status, reportIcon(report));
}
