import { AnalysisResultColumnId, analysisResultColumn } from '@app/v1/shared/analysis-results/columns/analysis-result-columns';

export type ColumnKey = AnalysisResultColumnId;

const REPORT_COLUMN_ORDER: readonly ColumnKey[] = [
  'actualEnergy', 'modeledEnergy', 'adjusted', 'baselineAdjustmentForNormalization', 'baselineAdjustmentForOther', 'baselineAdjustment',
  'SEnPI', 'bankedSavings', 'savingsUnbanked', 'savings', 'rollingSavings', 'rolling12MonthImprovement',
  'totalSavingsPercentImprovement', 'annualSavingsPercentImprovement', 'cummulativeSavings', 'newSavings'
];
const REPORT_COLUMN_LABELS: Partial<Record<ColumnKey, string>> = {
  actualEnergy: 'Actual use', modeledEnergy: 'Modeled use', adjusted: 'Adjusted use', baselineAdjustment: 'Baseline adjustment'
};

/** The report keeps its saved-column presentation while sharing result semantics with Analysis. */
export const COLUMN_OPTIONS: readonly { key: ColumnKey; label: string; section: 'use' | 'improvement' }[] = REPORT_COLUMN_ORDER.map(key => {
  const column = analysisResultColumn(key);
  return { key, label: REPORT_COLUMN_LABELS[key] ?? column.label, section: column.section };
});
