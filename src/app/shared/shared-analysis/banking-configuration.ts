import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';

export type BankingSourceIssue =
  | 'missing'
  | 'incompatible'
  | 'cycle'
  | 'dependency-missing';

export type BankedGroupIssue =
  | 'source'
  | 'group-unavailable'
  | 'data-unavailable'
  | 'years-missing'
  | 'applied-year-out-of-range'
  | 'baseline-year-out-of-range'
  | 'year-order';

export interface BankingSourceEvaluation {
  readonly source?: IdbAnalysisItem;
  readonly issue?: BankingSourceIssue;
}

export interface BankedGroupConfigurationEvaluation extends BankingSourceEvaluation {
  readonly sourceGroup?: AnalysisGroup;
  readonly appliedYears: readonly number[];
  readonly newBaselineYears: readonly number[];
  readonly groupIssue?: BankedGroupIssue;
  readonly valid: boolean;
}

export function evaluateBankingSource(
  analysis: IdbAnalysisItem | undefined,
  analyses: readonly IdbAnalysisItem[]
): BankingSourceEvaluation {
  if (!analysis?.hasBanking || !analysis.bankedAnalysisItemId) return { issue: 'missing' };
  const source = analyses.find(item => item.guid === analysis.bankedAnalysisItemId);
  if (!source) return { issue: 'missing' };
  if (source.guid === analysis.guid || bankingDependencyIncludes(source, analysis.guid, analyses)) {
    return { source, issue: 'cycle' };
  }
  if (!isCompatibleBankingSource(analysis, source)) return { source, issue: 'incompatible' };
  if (hasMissingBankingDependency(source, analyses)) return { source, issue: 'dependency-missing' };
  return { source };
}

export function evaluateBankedGroupConfiguration(
  analysis: IdbAnalysisItem | undefined,
  group: AnalysisGroup | undefined,
  analyses: readonly IdbAnalysisItem[],
  latestCompleteYear: number | undefined
): BankedGroupConfigurationEvaluation {
  const sourceEvaluation = evaluateBankingSource(analysis, analyses);
  const source = sourceEvaluation.source;
  const sourceGroup = source && group
    ? source.groups?.find(item => item.idbGroupId === group.idbGroupId)
    : undefined;
  const { appliedYears, newBaselineYears } = bankingYearOptions(
    source?.baselineYear,
    analysis?.baselineYear,
    latestCompleteYear
  );
  const groupIssue = bankedGroupIssue(
    analysis,
    group,
    sourceEvaluation.issue,
    sourceGroup,
    latestCompleteYear,
    appliedYears,
    newBaselineYears
  );
  return {
    ...sourceEvaluation,
    sourceGroup: sourceGroup && !isSkippedGroup(sourceGroup) ? sourceGroup : undefined,
    appliedYears,
    newBaselineYears,
    groupIssue,
    valid: !groupIssue
  };
}

export function isCompatibleBankingSource(current: IdbAnalysisItem, candidate: IdbAnalysisItem): boolean {
  return candidate.guid !== current.guid
    && candidate.facilityId === current.facilityId
    && candidate.analysisCategory === current.analysisCategory
    && (current.analysisCategory === 'water' || candidate.energyIsSource === current.energyIsSource);
}

export function bankingDependencyIncludes(
  source: IdbAnalysisItem,
  targetGuid: string,
  analyses: readonly IdbAnalysisItem[]
): boolean {
  const byGuid = new Map(analyses.map(analysis => [analysis.guid, analysis]));
  const visited = new Set<string>();
  let cursor: IdbAnalysisItem | undefined = source;
  while (cursor?.hasBanking && cursor.bankedAnalysisItemId) {
    if (cursor.bankedAnalysisItemId === targetGuid) return true;
    if (visited.has(cursor.guid)) return true;
    visited.add(cursor.guid);
    cursor = byGuid.get(cursor.bankedAnalysisItemId);
  }
  return false;
}

export function bankingYearOptions(
  sourceBaselineYear: number | undefined,
  analysisBaselineYear: number | undefined,
  latestCompleteYear: number | undefined
): { readonly appliedYears: readonly number[]; readonly newBaselineYears: readonly number[] } {
  return {
    appliedYears: yearRange(
      Number.isFinite(sourceBaselineYear) ? sourceBaselineYear! + 1 : undefined,
      latestCompleteYear
    ),
    newBaselineYears: yearRange(analysisBaselineYear, latestCompleteYear)
  };
}

export function getBankedAnalysisGroup(
  analysisItem: IdbAnalysisItem | undefined,
  group: AnalysisGroup | undefined,
  bankedAnalysisItem: IdbAnalysisItem | undefined
): AnalysisGroup | undefined {
  if (!analysisItem?.hasBanking
    || !analysisItem.bankedAnalysisItemId
    || bankedAnalysisItem?.guid !== analysisItem.bankedAnalysisItemId
    || !group) {
    return undefined;
  }

  return bankedAnalysisItem.groups?.find(item => item.idbGroupId === group.idbGroupId);
}

export function isBankedGroupConfigurationComplete(
  analysisItem: IdbAnalysisItem | undefined,
  group: AnalysisGroup | undefined,
  bankedAnalysisItem: IdbAnalysisItem | undefined
): boolean {
  const bankedGroup = getBankedAnalysisGroup(analysisItem, group, bankedAnalysisItem);
  return !!group?.applyBanking
    && !!bankedGroup
    && bankedGroup.analysisType !== 'skip'
    && bankedGroup.analysisType !== 'skipAnalysis'
    && Number.isFinite(group.bankedAnalysisYear)
    && Number.isFinite(group.newBaselineYear)
    && group.bankedAnalysisYear < group.newBaselineYear;
}

function bankedGroupIssue(
  analysis: IdbAnalysisItem | undefined,
  group: AnalysisGroup | undefined,
  sourceIssue: BankingSourceIssue | undefined,
  sourceGroup: AnalysisGroup | undefined,
  latestCompleteYear: number | undefined,
  appliedYears: readonly number[],
  newBaselineYears: readonly number[]
): BankedGroupIssue | undefined {
  if (!analysis?.hasBanking || !group?.applyBanking) return 'source';
  if (sourceIssue) return 'source';
  if (!sourceGroup || isSkippedGroup(sourceGroup)) return 'group-unavailable';
  if (!Number.isFinite(latestCompleteYear)) return 'data-unavailable';
  if (!Number.isFinite(group.bankedAnalysisYear) || !Number.isFinite(group.newBaselineYear)) return 'years-missing';
  if (!appliedYears.includes(group.bankedAnalysisYear)) return 'applied-year-out-of-range';
  if (!newBaselineYears.includes(group.newBaselineYear)) return 'baseline-year-out-of-range';
  if (group.bankedAnalysisYear >= group.newBaselineYear) return 'year-order';
  return undefined;
}

function hasMissingBankingDependency(source: IdbAnalysisItem, analyses: readonly IdbAnalysisItem[]): boolean {
  const byGuid = new Map(analyses.map(analysis => [analysis.guid, analysis]));
  const visited = new Set<string>();
  let cursor: IdbAnalysisItem | undefined = source;
  while (cursor?.hasBanking && cursor.bankedAnalysisItemId) {
    if (visited.has(cursor.guid)) return false;
    visited.add(cursor.guid);
    const dependency = byGuid.get(cursor.bankedAnalysisItemId);
    if (!dependency) return true;
    cursor = dependency;
  }
  return false;
}

function yearRange(start: number | undefined, end: number | undefined): readonly number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start! > end!) return [];
  return Array.from({ length: end! - start! + 1 }, (_, index) => start! + index);
}

function isSkippedGroup(group: AnalysisGroup): boolean {
  return group.analysisType === 'skip' || group.analysisType === 'skipAnalysis';
}
