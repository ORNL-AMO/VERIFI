import { AnalysisGroup, AnalysisType } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { summarizeStatusAttention } from '@app/v1/status/status.dismissals';
import type { StatusAttentionSummary, StatusItem } from '@app/v1/status/status.models';

export type AnalysisWorkbenchTabId = 'setup' | 'banking' | 'regression' | 'annual' | 'monthly-table' | 'monthly-chart' | 'group-contributions';
export type AnalysisWorkbenchStageKind = 'analysis' | 'group' | 'facility' | 'used-by';

export interface AnalysisWorkbenchTab {
  readonly id: AnalysisWorkbenchTabId;
  readonly label: string;
  readonly icon: IconName;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
}

export interface AnalysisWorkbenchStage {
  readonly id: string;
  readonly kind: AnalysisWorkbenchStageKind;
  readonly label: string;
  readonly groupGuid?: string;
  readonly route: readonly string[];
}

export interface AnalysisWorkbenchStageNavigation extends AnalysisWorkbenchStage {
  readonly current: boolean;
  readonly completed: boolean;
  readonly hasBlockingErrors: boolean;
  readonly available: boolean;
  readonly canOpen: boolean;
}

export type AnalysisWorkbenchAttention = Readonly<Record<string, StatusAttentionSummary | undefined>>;
export type AnalysisWorkbenchTabAttention = Readonly<Partial<Record<AnalysisWorkbenchTabId, StatusAttentionSummary>>>;

export const ANALYSIS_GROUP_SETUP_TAB: AnalysisWorkbenchTab = { id: 'setup', label: 'Setup', icon: 'settings' };
export const ANALYSIS_GROUP_BANKING_TAB: AnalysisWorkbenchTab = { id: 'banking', label: 'Banked Savings', icon: 'bank' };
export const ANALYSIS_GROUP_REGRESSION_TAB: AnalysisWorkbenchTab = { id: 'regression', label: 'Regression', icon: 'covariate' };
export const ANALYSIS_GROUP_ANNUAL_TAB: AnalysisWorkbenchTab = { id: 'annual', label: 'Annual', icon: 'calendar' };
export const ANALYSIS_GROUP_MONTHLY_TABLE_TAB: AnalysisWorkbenchTab = { id: 'monthly-table', label: 'Monthly Table', icon: 'table' };
export const ANALYSIS_GROUP_MONTHLY_CHART_TAB: AnalysisWorkbenchTab = { id: 'monthly-chart', label: 'Monthly Chart', icon: 'chartLine' };
export const ANALYSIS_FACILITY_GROUP_CONTRIBUTIONS_TAB: AnalysisWorkbenchTab = {
  id: 'group-contributions',
  label: 'Group Contributions',
  icon: 'barChart'
};
export const ANALYSIS_FACILITY_TABS: readonly AnalysisWorkbenchTab[] = [
  ANALYSIS_GROUP_ANNUAL_TAB,
  ANALYSIS_GROUP_MONTHLY_TABLE_TAB,
  ANALYSIS_GROUP_MONTHLY_CHART_TAB,
  ANALYSIS_FACILITY_GROUP_CONTRIBUTIONS_TAB
];

export function isSkippedAnalysisType(type: AnalysisType): boolean {
  return type === 'skip' || type === 'skipAnalysis';
}

export function tabsForAnalysisGroup(
  group: AnalysisGroup | undefined,
  analysisHasBanking = false,
  bankingAvailable = false
): readonly AnalysisWorkbenchTab[] {
  if (!group || isSkippedAnalysisType(group.analysisType)) return [ANALYSIS_GROUP_SETUP_TAB];
  return [
    ANALYSIS_GROUP_SETUP_TAB,
    ...(analysisHasBanking && group.applyBanking ? [{
      ...ANALYSIS_GROUP_BANKING_TAB,
      disabled: !bankingAvailable,
      disabledReason: bankingAvailable ? undefined : 'Complete valid banking options in Setup to view Banked Savings.'
    }] : []),
    ...(group.analysisType === 'regression' ? [ANALYSIS_GROUP_REGRESSION_TAB] : []),
    ANALYSIS_GROUP_ANNUAL_TAB,
    ANALYSIS_GROUP_MONTHLY_TABLE_TAB,
    ANALYSIS_GROUP_MONTHLY_CHART_TAB
  ];
}

export function buildAnalysisWorkbenchStages(
  facilityGuid: string,
  analysis: IdbAnalysisItem,
  meterGroups: readonly IdbUtilityMeterGroup[]
): readonly AnalysisWorkbenchStage[] {
  const base = ['/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'workbench', analysis.guid];
  const names = new Map(meterGroups.map(group => [group.guid, group.name]));
  return [
    { id: 'analysis', kind: 'analysis', label: 'Analysis Setup', route: [...base, 'setup'] },
    ...analysis.groups.map((group, index) => ({
      id: `group:${group.idbGroupId}`,
      kind: 'group' as const,
      label: names.get(group.idbGroupId) || `Meter group ${index + 1}`,
      groupGuid: group.idbGroupId,
      route: [...base, 'group', group.idbGroupId, 'setup']
    })),
    { id: 'facility', kind: 'facility', label: 'Facility Results', route: [...base, 'facility', 'annual'] },
    { id: 'used-by', kind: 'used-by', label: 'Used By', route: [...base, 'used-by'] }
  ];
}

export function activeAnalysisWorkbenchStageId(url: string): string {
  const cleanUrl = url.split(/[?#]/, 1)[0];
  const groupMatch = /\/group\/([^/]+)\//.exec(cleanUrl);
  if (groupMatch) return `group:${decodeRoutePart(groupMatch[1])}`;
  if (/\/facility\/(annual|monthly(?:-table|-chart)?|group-contributions)$/.test(cleanUrl)) return 'facility';
  if (/\/used-by$/.test(cleanUrl)) return 'used-by';
  return 'analysis';
}

export function stageHasBlockingErrors(
  stage: AnalysisWorkbenchStage | undefined,
  analysisGuid: string,
  findings: readonly StatusItem[]
): boolean {
  if (!stage || stage.kind === 'used-by') return false;
  const errors = findings.filter(finding => finding.severity === 'error');
  if (stage.kind === 'analysis') {
    return errors.some(finding => finding.entity.kind === 'facility-analysis'
      && finding.entity.guid === analysisGuid);
  }
  if (stage.kind === 'group') {
    return errors.some(finding => finding.entity.kind === 'analysis-group'
      && finding.entity.guid === `${analysisGuid}:${stage.groupGuid}`);
  }
  return errors.length > 0;
}

export function buildAnalysisWorkbenchStageNavigation(
  stages: readonly AnalysisWorkbenchStage[],
  currentStageId: string,
  analysisGuid: string,
  findings: readonly StatusItem[],
  navigationBlocked = false,
  statusReady = true
): readonly AnalysisWorkbenchStageNavigation[] {
  const currentIndex = stages.findIndex(stage => stage.id === currentStageId);
  const blockingErrors = new Map(stages.map(stage => [
    stage.id,
    stageHasBlockingErrors(stage, analysisGuid, findings)
  ]));
  const completion = new Map(stages.map(stage => [
    stage.id,
    statusReady
      && (stage.kind === 'analysis' || stage.kind === 'group')
      && !blockingErrors.get(stage.id)
  ]));
  const setupComplete = completion.get('analysis') === true;
  const groupStages = stages.filter(stage => stage.kind === 'group');
  const groupsComplete = groupStages.length > 0 && groupStages.every(stage => completion.get(stage.id) === true);
  return stages.map((stage, index) => ({
    ...stage,
    current: index === currentIndex,
    completed: completion.get(stage.id) === true,
    hasBlockingErrors: blockingErrors.get(stage.id) === true,
    available: stage.kind === 'analysis'
      || stage.kind === 'used-by'
      || (stage.kind === 'group' && setupComplete)
      || (stage.kind === 'facility' && setupComplete && groupsComplete),
    canOpen: index === currentIndex || (!navigationBlocked && (
      stage.kind === 'analysis'
      || stage.kind === 'used-by'
      || (stage.kind === 'group' && setupComplete)
      || (stage.kind === 'facility' && setupComplete && groupsComplete)
    ))
  }));
}

export function findingsForAnalysisStage(
  stage: AnalysisWorkbenchStage | undefined,
  analysisGuid: string,
  findings: readonly StatusItem[]
): readonly StatusItem[] {
  if (!stage || stage.kind === 'used-by') return [];
  if (stage.kind === 'analysis') {
    return findings.filter(finding => finding.entity.kind === 'facility-analysis'
      && finding.entity.guid === analysisGuid);
  }
  if (stage.kind === 'group') {
    return findings.filter(finding => finding.entity.kind === 'analysis-group'
      && finding.entity.guid === `${analysisGuid}:${stage.groupGuid}`);
  }
  return findings;
}

export function buildAnalysisWorkbenchStageAttention(
  stages: readonly AnalysisWorkbenchStage[],
  analysisGuid: string,
  findings: readonly StatusItem[]
): AnalysisWorkbenchAttention {
  const attention: Record<string, StatusAttentionSummary | undefined> = {};
  stages.forEach(stage => {
    const stageFindings = findings.filter(finding => findingMatchesStage(
      finding,
      stage,
      analysisGuid
    ));
    const summary = summarizeStatusAttention(stageFindings);
    if (summary.total > 0) attention[stage.id] = summary;
  });
  return attention;
}

export function buildAnalysisWorkbenchTabAttention(
  tabs: readonly AnalysisWorkbenchTab[],
  analysisGuid: string,
  scope: 'group' | 'facility',
  findings: readonly StatusItem[],
  groupGuid?: string
): AnalysisWorkbenchTabAttention {
  const attention: Partial<Record<AnalysisWorkbenchTabId, StatusAttentionSummary>> = {};
  tabs.forEach(tab => {
    const tabFindings = findings.filter(finding => {
      const destination = finding.destination;
      return destination.kind === 'facility-analysis'
        && destination.analysisGuid === analysisGuid
        && destination.scope === scope
        && destination.groupGuid === groupGuid
        && destination.tab === tab.id;
    });
    const summary = summarizeStatusAttention(tabFindings);
    if (summary.total > 0) attention[tab.id] = summary;
  });
  return attention;
}

function findingMatchesStage(
  finding: StatusItem,
  stage: AnalysisWorkbenchStage,
  analysisGuid: string
): boolean {
  const destination = finding.destination;
  if (destination.kind !== 'facility-analysis' || destination.analysisGuid !== analysisGuid) return false;
  if (stage.kind === 'analysis') return destination.scope === 'analysis';
  if (stage.kind === 'group') return destination.scope === 'group' && destination.groupGuid === stage.groupGuid;
  if (stage.kind === 'facility') return destination.scope === 'facility';
  return false;
}

function decodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
