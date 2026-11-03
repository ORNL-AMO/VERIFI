import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { AnalysisResultsTableCell } from '../results-table/analysis-results-table.models';

const COLUMN_DEFINITIONS = [
  { id: 'actualEnergy', label: 'Actual', selectionLabel: 'Actual use', field: 'energyUse', section: 'use' },
  { id: 'modeledEnergy', label: 'Modeled', selectionLabel: 'Modeled use', field: 'modeledEnergy', section: 'use', period: 'monthly', hideDuringTransition: true },
  { id: 'adjusted', label: 'Adjusted', field: 'adjusted', section: 'use', hideDuringTransition: true },
  { id: 'baselineAdjustmentForNormalization', label: 'Baseline adjustment for normalization', field: 'baselineAdjustmentForNormalization', section: 'use' },
  { id: 'baselineAdjustmentForOther', label: 'Baseline adjustment for other', field: 'baselineAdjustmentForOtherV2', section: 'use', hideDuringTransition: true },
  { id: 'baselineAdjustment', label: 'Total baseline adjustment', field: 'baselineAdjustment', section: 'use', hideDuringTransition: true },
  { id: 'SEnPI', label: 'SEnPI', field: 'SEnPI', section: 'improvement', hideDuringTransition: true },
  { id: 'bankedSavings', label: 'Banked savings', field: 'savingsBanked', section: 'improvement', banking: true, hideDuringTransition: true },
  { id: 'savingsUnbanked', label: 'Unbanked savings', field: 'savingsUnbanked', section: 'improvement', banking: true, hideDuringTransition: true },
  { id: 'savings', label: 'Savings', field: 'savings', section: 'improvement', hideDuringTransition: true },
  { id: 'totalSavingsPercentImprovement', label: 'Total savings % improvement', field: 'totalSavingsPercentImprovement', section: 'improvement', period: 'annual', percent: true },
  { id: 'newSavings', label: 'New savings', field: 'newSavings', section: 'improvement', period: 'annual' },
  { id: 'annualSavingsPercentImprovement', label: 'Annual savings % improvement', field: 'annualSavingsPercentImprovement', section: 'improvement', period: 'annual', percent: true },
  { id: 'cummulativeSavings', label: 'Cumulative savings', field: 'cummulativeSavings', section: 'improvement', period: 'annual' },
  { id: 'rollingSavings', label: 'Rolling savings', field: 'rollingSavings', section: 'improvement', period: 'monthly' },
  { id: 'rolling12MonthImprovement', label: 'Rolling 12-month improvement', field: 'rolling12MonthImprovement', section: 'improvement', period: 'monthly', percent: true }
] as const;

export type AnalysisResultColumnId = typeof COLUMN_DEFINITIONS[number]['id'];
export type AnalysisResultPeriod = 'annual' | 'monthly';

export interface AnalysisResultColumn {
  readonly id: AnalysisResultColumnId;
  readonly label: string;
  readonly selectionLabel?: string;
  readonly field: keyof AnnualAnalysisSummary | keyof MonthlyAnalysisSummaryData;
  readonly section: 'use' | 'improvement';
  readonly period?: AnalysisResultPeriod;
  readonly banking?: boolean;
  readonly percent?: boolean;
  readonly hideDuringTransition?: boolean;
}

/** Shared result semantics; callers retain their labels, ordering and selection policies. */
export const ANALYSIS_RESULT_COLUMNS: readonly AnalysisResultColumn[] = COLUMN_DEFINITIONS;
const COLUMNS_BY_ID = new Map(ANALYSIS_RESULT_COLUMNS.map(column => [column.id, column]));

export function analysisResultColumn(id: AnalysisResultColumnId): AnalysisResultColumn {
  return COLUMNS_BY_ID.get(id)!;
}

export function analysisResultColumnsForPeriod(period: AnalysisResultPeriod, banking: boolean): readonly AnalysisResultColumn[] {
  return ANALYSIS_RESULT_COLUMNS.filter(column => (!column.period || column.period === period) && (!column.banking || banking));
}

/** Callers decide what makes a transition and may preserve a stricter surface-specific mask. */
export function analysisResultCell(row: AnnualAnalysisSummary | MonthlyAnalysisSummaryData, column: AnalysisResultColumn,
  transition: boolean, hideDuringTransition = column.hideDuringTransition): AnalysisResultsTableCell {
  return { value: transition && hideDuringTransition ? null : finiteAnalysisResultValue(row[column.field]), percent: column.percent };
}

export function finiteAnalysisResultValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
