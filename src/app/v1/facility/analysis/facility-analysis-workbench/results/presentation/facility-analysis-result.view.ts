import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { MeterResultsChartMetric, MeterResultsChartRow } from '@app/v1/facility/data/meters/models';

export const ANALYSIS_CHART_METRICS: readonly MeterResultsChartMetric[] = [
  { id: 'actual', label: 'Actual' },
  { id: 'modeled', label: 'Modeled' },
  { id: 'savings', label: 'Savings' }
];

export function annualChartRows(rows: readonly AnnualAnalysisSummary[]): readonly MeterResultsChartRow[] {
  return rows.map(row => ({
    periodKey: String(row.year),
    periodLabel: String(row.year),
    sortValue: row.year,
    values: { actual: row.energyUse, modeled: row.adjusted, savings: row.savings }
  }));
}

export function monthlyChartRows(rows: readonly MonthlyAnalysisSummaryData[]): readonly MeterResultsChartRow[] {
  return rows.map(row => {
    const date = new Date(row.date);
    return {
      periodKey: `${date.getFullYear()}-${date.getMonth()}`,
      periodLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      sortValue: date.getTime(),
      values: { actual: row.energyUse, modeled: row.modeledEnergy, savings: row.savings }
    };
  });
}
