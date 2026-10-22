import { facilityReportTypeLabel, type ReportConfigurationStatus } from '../facility-report.models';
import type { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import type { AnalysisNavigationStage } from '@app/v1/shared/analysis-stage-navigation/analysis-stage-navigation.component';

export type FacilityReportStageId = 'setup' | 'data-checks' | 'report';
export interface FacilityReportStage extends AnalysisNavigationStage { readonly id: FacilityReportStageId; }

export function hasFacilityReportDataChecks(report: IdbFacilityReport): boolean {
  return ['analysis', 'savings', 'costSavings'].includes(report.facilityReportType);
}

export function facilityReportStage(value?: string): FacilityReportStageId {
  return value === 'data-checks' || value === 'report' ? value : 'setup';
}

export function buildFacilityReportStages(report: IdbFacilityReport, current: FacilityReportStageId, status: ReportConfigurationStatus = 'checking'): readonly FacilityReportStage[] {
  const route = ['/v1', 'workspace', 'facility', report.facilityId, 'reports', 'workbench', report.guid];
  const stages: ReadonlyArray<Pick<FacilityReportStage, 'id' | 'label' | 'icon'>> = [
    { id: 'setup', label: 'Setup' },
    ...(hasFacilityReportDataChecks(report) ? [{ id: 'data-checks' as const, label: 'Data Checks', icon: 'checklist' as const }] : []),
    { id: 'report', label: `${facilityReportTypeLabel(report.facilityReportType)} Report`, icon: 'report' }
  ];
  return stages.map(stage => ({ ...stage, kind: stage.id === 'setup' ? 'analysis' as const : undefined, route: [...route, stage.id], current: current === stage.id,
    completed: stage.id === 'setup' && status === 'ready', hasBlockingErrors: stage.id === 'setup' && status === 'error', canOpen: true }));
}
