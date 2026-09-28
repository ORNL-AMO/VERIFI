import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import * as _ from 'lodash';

/**
 * Finds analyses whose groups changed without relying on collection order.
 * Analysis and group GUIDs are the durable identities used by the workspace.
 */
export function changedAnalysesByGuid(
  current: readonly IdbAnalysisItem[],
  proposed: readonly IdbAnalysisItem[]
): readonly IdbAnalysisItem[] {
  const currentByGuid = new Map(current.map(analysis => [analysis.guid, analysis]));
  return proposed.filter(analysis => {
    const existing = currentByGuid.get(analysis.guid);
    return !existing || !analysisGroupsEqualByGuid(existing.groups, analysis.groups);
  });
}

export function analysisGroupsEqualByGuid(
  first: readonly AnalysisGroup[],
  second: readonly AnalysisGroup[]
): boolean {
  if (first.length !== second.length) return false;
  const secondByGuid = new Map(second.map(group => [group.idbGroupId, group]));
  return first.every(group => {
    const matchingGroup = secondByGuid.get(group.idbGroupId);
    return !!matchingGroup && _.isEqual(group, matchingGroup);
  });
}
