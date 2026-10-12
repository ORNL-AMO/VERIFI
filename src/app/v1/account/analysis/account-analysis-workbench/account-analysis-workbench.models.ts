import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { summarizeStatusAttention } from '@app/v1/status/status.dismissals';
import type { StatusAttentionSummary, StatusItem } from '@app/v1/status/status.models';

export type AccountAnalysisWorkbenchStageId = 'setup' | 'select-items' | 'results' | 'used-by';
export type AccountAnalysisResultTabId = 'annual' | 'monthly-table' | 'monthly-chart' | 'facility-details';

export interface AccountAnalysisWorkbenchStage {
  readonly id: AccountAnalysisWorkbenchStageId;
  readonly label: string;
  readonly icon: IconName;
  readonly route: readonly string[];
}

export interface AccountAnalysisWorkbenchStageNavigation extends AccountAnalysisWorkbenchStage {
  readonly current: boolean;
  readonly completed: boolean;
  readonly hasBlockingErrors: boolean;
  readonly available: boolean;
  readonly canOpen: boolean;
  readonly attention?: StatusAttentionSummary;
}

export interface AccountAnalysisResultTab {
  readonly id: AccountAnalysisResultTabId;
  readonly label: string;
  readonly icon: IconName;
}

export interface AccountAnalysisWorkbenchReadiness {
  readonly statusReady: boolean;
  readonly setupComplete: boolean;
  readonly selectionsComplete: boolean;
}

export const ACCOUNT_ANALYSIS_RESULT_TABS: readonly AccountAnalysisResultTab[] = [
  { id: 'annual', label: 'Annual', icon: 'calendar' },
  { id: 'monthly-table', label: 'Monthly Table', icon: 'table' },
  { id: 'monthly-chart', label: 'Monthly Chart', icon: 'chartLine' },
  { id: 'facility-details', label: 'Facility Details', icon: 'facility' }
];

export function buildAccountAnalysisWorkbenchStages(
  accountGuid: string,
  analysisGuid: string
): readonly AccountAnalysisWorkbenchStage[] {
  const base = ['/v1', 'workspace', 'account', accountGuid, 'analysis', 'workbench', analysisGuid];
  return [
    { id: 'setup', label: 'Setup', icon: 'settings', route: [...base, 'setup'] },
    { id: 'select-items', label: 'Select Facility Items', icon: 'checklist', route: [...base, 'select-items'] },
    { id: 'results', label: 'Results', icon: 'chartAnalysis', route: [...base, 'results', 'annual'] },
    { id: 'used-by', label: 'Used By', icon: 'link', route: [...base, 'used-by'] }
  ];
}

export function accountAnalysisWorkbenchReadiness(
  analysis: IdbAccountAnalysisItem | undefined,
  findings: readonly StatusItem[],
  statusReady: boolean,
  facilitySelectionsComplete?: boolean
): AccountAnalysisWorkbenchReadiness {
  const setupComplete = !!analysis
    && !!analysis.name?.trim()
    && typeof analysis.baselineYear === 'number'
    && Number.isFinite(analysis.baselineYear);
  const selectionsInvalid = findings.some(finding =>
    finding.code === 'account-analysis.configuration.invalid'
    && findingReasons(finding).includes('facilitiesSelectionsInvalid')
  );
  return {
    statusReady,
    setupComplete: statusReady && setupComplete,
    selectionsComplete: statusReady
      && setupComplete
      && !selectionsInvalid
      && (facilitySelectionsComplete ?? true)
  };
}

export function buildAccountAnalysisWorkbenchStageNavigation(
  stages: readonly AccountAnalysisWorkbenchStage[],
  activeStageId: AccountAnalysisWorkbenchStageId,
  readiness: AccountAnalysisWorkbenchReadiness,
  findings: readonly StatusItem[]
): readonly AccountAnalysisWorkbenchStageNavigation[] {
  return stages.map(stage => {
    const available = stage.id === 'setup'
      || stage.id === 'used-by'
      || (stage.id === 'select-items' && readiness.setupComplete)
      || (stage.id === 'results' && readiness.selectionsComplete);
    const completed = stage.id === 'setup'
      ? readiness.setupComplete
      : stage.id === 'select-items'
        ? readiness.selectionsComplete
        : false;
    const stageFindings = findingsForAccountAnalysisStage(stage.id, findings);
    const attention = summarizeStatusAttention(stageFindings);
    return {
      ...stage,
      current: stage.id === activeStageId,
      completed,
      hasBlockingErrors: stageFindings.some(finding => finding.severity === 'error'),
      available,
      canOpen: available,
      attention: attention.total > 0 ? attention : undefined
    };
  });
}

export function activeAccountAnalysisWorkbenchStageId(url: string): AccountAnalysisWorkbenchStageId {
  const cleanUrl = url.split(/[?#]/, 1)[0];
  if (/\/select-items$/.test(cleanUrl)) return 'select-items';
  if (/\/results(?:\/|$)/.test(cleanUrl)) return 'results';
  if (/\/used-by$/.test(cleanUrl)) return 'used-by';
  return 'setup';
}

export function activeAccountAnalysisResultTabId(url: string): AccountAnalysisResultTabId {
  const segment = url.split(/[?#]/, 1)[0].split('/').filter(Boolean).at(-1);
  return ACCOUNT_ANALYSIS_RESULT_TABS.some(tab => tab.id === segment)
    ? segment as AccountAnalysisResultTabId
    : 'annual';
}

export function findingsForAccountAnalysisStage(
  stageId: AccountAnalysisWorkbenchStageId,
  findings: readonly StatusItem[]
): readonly StatusItem[] {
  if (stageId === 'setup') {
    return findings.filter(finding => finding.code === 'account-analysis.configuration.invalid'
      && findingReasons(finding).some(reason => reason === 'missingName' || reason === 'missingBaselineYear'));
  }
  if (stageId === 'select-items') {
    return findings.filter(finding => finding.code === 'account-analysis.children.warning'
      || (finding.code === 'account-analysis.configuration.invalid'
        && findingReasons(finding).includes('facilitiesSelectionsInvalid')));
  }
  return [];
}

function findingReasons(finding: StatusItem): readonly string[] {
  const reasons = finding.evidence['reasons'];
  return Array.isArray(reasons) ? reasons.map(String) : reasons === undefined ? [] : [String(reasons)];
}
