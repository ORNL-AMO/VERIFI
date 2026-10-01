import { AnalysisGroup, AnalysisType } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

export type AnalysisWorkbenchTabId = 'setup' | 'regression' | 'annual' | 'monthly';
export type AnalysisWorkbenchStageKind = 'analysis' | 'group' | 'facility' | 'used-by';

export interface AnalysisWorkbenchTab {
  readonly id: AnalysisWorkbenchTabId;
  readonly label: string;
  readonly icon: IconName;
}

export interface AnalysisWorkbenchStage {
  readonly id: string;
  readonly kind: AnalysisWorkbenchStageKind;
  readonly label: string;
  readonly groupGuid?: string;
  readonly route: readonly string[];
}

export const ANALYSIS_GROUP_SETUP_TAB: AnalysisWorkbenchTab = { id: 'setup', label: 'Setup', icon: 'settings' };
export const ANALYSIS_GROUP_REGRESSION_TAB: AnalysisWorkbenchTab = { id: 'regression', label: 'Regression', icon: 'analysis' };
export const ANALYSIS_GROUP_ANNUAL_TAB: AnalysisWorkbenchTab = { id: 'annual', label: 'Annual', icon: 'calendar' };
export const ANALYSIS_GROUP_MONTHLY_TAB: AnalysisWorkbenchTab = { id: 'monthly', label: 'Monthly', icon: 'table' };

export function isSkippedAnalysisType(type: AnalysisType): boolean {
  return type === 'skip' || type === 'skipAnalysis';
}

export function tabsForAnalysisGroup(group: AnalysisGroup | undefined): readonly AnalysisWorkbenchTab[] {
  if (!group || isSkippedAnalysisType(group.analysisType)) return [ANALYSIS_GROUP_SETUP_TAB];
  return [
    ANALYSIS_GROUP_SETUP_TAB,
    ...(group.analysisType === 'regression' ? [ANALYSIS_GROUP_REGRESSION_TAB] : []),
    ANALYSIS_GROUP_ANNUAL_TAB,
    ANALYSIS_GROUP_MONTHLY_TAB
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
  if (/\/facility\/(annual|monthly)$/.test(cleanUrl)) return 'facility';
  if (/\/used-by$/.test(cleanUrl)) return 'used-by';
  return 'analysis';
}

function decodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
