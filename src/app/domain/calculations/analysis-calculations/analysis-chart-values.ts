import type { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';

/** Numerical chart meaning shared by Analysis and saved visualizations. Project before filtering dates. */
export function annualAnalysisChartValues(row: AnnualAnalysisSummary): Readonly<Record<string, number | null>> {
  return { actual: row.energyUse, calculated: row.isIntermediateBanked ? null : row.adjusted,
    annualImprovement: row.isIntermediateBanked ? null : row.annualSavingsPercentImprovement,
    totalImprovement: row.totalSavingsPercentImprovement };
}
export function monthlyAnalysisUseValues(row: MonthlyAnalysisSummaryData): Readonly<Record<string, number | null>> {
  return { actual: row.energyUse, calculated: row.isIntermediateBanked ? null : row.adjusted };
}
export function monthlyAnalysisSavingsValues(rows: readonly MonthlyAnalysisSummaryData[], includeBanking: boolean): readonly Readonly<Record<string, number | null>>[] {
  const transitionCarry = carriedTransitionImprovement(rows);
  return rows.map(row => {
    const rollingImprovement = row.rolling12MonthImprovement;
    const values: Record<string, number | null> = {
      savings: (!includeBanking || !row.isBanked) && rollingImprovement >= 0 ? rollingImprovement : 0,
      losses: (!includeBanking || !row.isBanked) && rollingImprovement < 0 ? rollingImprovement : 0
    };
    if (includeBanking) {
      const bankedImprovement = row.isIntermediateBanked
        ? transitionCarry.get(row) ?? row.percentSavingsComparedToBaseline : rollingImprovement;
      values['bankedSavings'] = row.isBanked && bankedImprovement >= 0 ? bankedImprovement : 0;
      values['bankedLosses'] = row.isBanked && bankedImprovement < 0 ? bankedImprovement : 0;
    }
    return values;
  });
}

function carriedTransitionImprovement(rows: readonly MonthlyAnalysisSummaryData[]): ReadonlyMap<MonthlyAnalysisSummaryData, number> {
  const carry = new Map<MonthlyAnalysisSummaryData, number>();
  let appliedImprovement: number | undefined;
  [...rows].sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime()).forEach(row => {
    if (row.isBanked && !row.isIntermediateBanked && Number.isFinite(row.percentSavingsComparedToBaseline)) {
      appliedImprovement = row.percentSavingsComparedToBaseline;
    } else if (row.isIntermediateBanked && appliedImprovement !== undefined) {
      carry.set(row, appliedImprovement);
    }
  });
  return carry;
}
