import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { AnalysisVisualizationResults } from '../visualizations/analysis/facility-analysis-source';
import { resolveReportingAnalysis } from '../visualizations/analysis/reporting-analysis';
import type { HomeAnalysisBinding, HomeOwner } from './home-dashboard';

export function homeGoalContext(binding: HomeAnalysisBinding, snapshot: AccountWorkspaceSnapshot) {
  const exact = binding.kind === 'exact' ? [...snapshot.facilityAnalyses, ...snapshot.accountAnalyses]
    .find(item => item.guid === binding.analysisGuid && item.accountId === snapshot.account.guid) : undefined;
  const owner: HomeOwner | undefined = binding.kind === 'reporting' ? binding.owner : exact
    ? 'facilityId' in exact ? { kind: 'facility', guid: exact.facilityId } : { kind: 'account', guid: snapshot.account.guid } : undefined;
  const record = owner?.kind === 'account' ? snapshot.account.guid === owner.guid ? snapshot.account : undefined
    : snapshot.facilities.find(item => item.guid === owner?.guid && item.accountId === snapshot.account.guid);
  const category = binding.kind === 'reporting' ? binding.category : exact?.analysisCategory;
  const resolved = binding.kind === 'reporting' ? resolveReportingAnalysis(binding, snapshot)
    : exact ? { state: 'ready' as const, analysis: exact } : { state: 'missing-source' as const, message: 'The named analysis is unavailable.' };
  const q = record?.sustainabilityQuestions;
  const enabled = category === 'water' ? q?.waterReductionGoal : q?.energyReductionGoal;
  const target = category === 'water' ? q?.waterReductionPercent : q?.energyReductionPercent;
  const baseline = category === 'water' ? q?.waterReductionBaselineYear : q?.energyReductionBaselineYear;
  const year = category === 'water' ? q?.waterReductionTargetYear : q?.energyReductionTargetYear;
  const absolute = category === 'water' ? q?.waterIsAbsolute : q?.energyIsAbsolute;
  const validYear = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 9999;
  const goalValid = enabled === true && Number.isFinite(target) && target > 0 && validYear(baseline) && validYear(year) && year > baseline;
  return { owner, ownerName: record?.name ?? 'Unavailable owner', category, resolved,
    goal: { state: !enabled ? 'missing' as const : goalValid ? 'ready' as const : 'invalid' as const, target, baseline, year, absolute },
    analysis: resolved.state === 'ready' ? resolved.analysis : undefined,
    message: !record ? 'This goal owner is unavailable in the current account.' : resolved.state !== 'ready' ? resolved.message : undefined };
}

/** The latest finite returned rolling result retains its own date and partial-input evidence. */
export function homeGoalResult(value: AnalysisVisualizationResults, target?: number) {
  const monthly = value.monthly.filter(row => Number.isFinite(new Date(row.date).getTime()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = monthly.find(row => Number.isFinite(row.rolling12MonthImprovement));
  if (!latest) return { state: 'empty' as const, message: 'No eligible rolling improvement result is available.' };
  const partial = !!latest.missingValueWarning || !!latest.missingPredictors?.length;
  const improvement = latest.rolling12MonthImprovement;
  return { state: 'ready' as const, improvement, through: new Date(latest.date), partial,
    horizon: monthly[0] ? new Date(monthly[0].date) : undefined,
    towardTarget: !partial && Number.isFinite(target) && target! > 0 ? improvement / target! * 100 : undefined,
    units: value.analysis.analysisCategory === 'water' ? value.analysis.waterUnit : value.analysis.energyUnit,
    basis: value.analysis.analysisCategory === 'water' ? 'Water' : value.analysis.energyIsSource ? 'Source energy' : 'Site energy' };
}
