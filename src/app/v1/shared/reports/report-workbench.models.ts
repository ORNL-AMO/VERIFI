import type { AnalysisNavigationStage } from '@app/v1/shared/analysis-stage-navigation/analysis-stage-navigation.component';
import type { ReportConfigurationStatus } from '@app/v1/facility/reports/facility-report.models';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

export type ReportStageId = 'setup' | 'data-checks' | 'report';
export interface ReportWorkbenchStage extends AnalysisNavigationStage { readonly id: ReportStageId; }
export function reportStage(value?: string): ReportStageId { return value === 'data-checks' || value === 'report' ? value : 'setup'; }
export function buildReportStages(route: readonly string[], typeLabel: string, current: ReportStageId, hasChecks: boolean, status: ReportConfigurationStatus = 'checking', icon: IconName = 'report'): readonly ReportWorkbenchStage[] {
  const stages: readonly Pick<ReportWorkbenchStage, 'id' | 'label' | 'icon'>[] = [
    { id: 'setup', label: 'Setup' },
    ...(hasChecks ? [{ id: 'data-checks' as const, label: 'Data Checks', icon: 'checklist' as const }] : []),
    { id: 'report', label: `${typeLabel} Report`, icon }
  ];
  return stages.map(stage => ({ ...stage, kind: stage.id === 'setup' ? 'analysis' as const : undefined, route: [...route, stage.id], current: current === stage.id,
    completed: stage.id === 'setup' && status === 'ready', hasBlockingErrors: stage.id === 'setup' && status === 'error', canOpen: true }));
}
