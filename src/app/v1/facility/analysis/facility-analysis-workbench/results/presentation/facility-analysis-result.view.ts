import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { MeterResultsChartMetric, MeterResultsChartRow } from '@app/v1/facility/data/meters/models';

export const ANALYSIS_CHART_METRICS: readonly MeterResultsChartMetric[] = [
  { id: 'actual', label: 'Actual' },
  { id: 'modeled', label: 'Modeled' },
  { id: 'savings', label: 'Savings' }
];

export function annualImprovementChartMetrics(
  category: 'energy' | 'water' | undefined
): readonly MeterResultsChartMetric[] {
  return category === 'water'
    ? [
      { id: 'annualImprovement', label: 'Annual Consumption Improvement', unit: '%' },
      { id: 'totalImprovement', label: 'Total Consumption Improvement', unit: '%' }
    ]
    : [
      { id: 'annualImprovement', label: 'Annual Energy Improvement', unit: '%' },
      { id: 'totalImprovement', label: 'Total Energy Improvement', unit: '%' }
    ];
}

export function annualUseChartMetrics(
  category: 'energy' | 'water' | undefined,
  unit: string | undefined
): readonly MeterResultsChartMetric[] {
  return category === 'water'
    ? [
      { id: 'actual', label: 'Actual Water Consumption', unit },
      { id: 'calculated', label: 'Calculated Water Consumption', unit }
    ]
    : [
      { id: 'actual', label: 'Actual Energy Use', unit },
      { id: 'calculated', label: 'Calculated Energy Use', unit }
    ];
}

export function annualUseChartRows(rows: readonly AnnualAnalysisSummary[]): readonly MeterResultsChartRow[] {
  return rows.map(row => ({
    periodKey: String(row.year),
    periodLabel: String(row.year),
    sortValue: row.year,
    values: { actual: row.energyUse, calculated: row.adjusted }
  }));
}

export function annualImprovementChartRows(rows: readonly AnnualAnalysisSummary[]): readonly MeterResultsChartRow[] {
  return rows.map(row => ({
    periodKey: String(row.year),
    periodLabel: String(row.year),
    sortValue: row.year,
    values: {
      annualImprovement: row.annualSavingsPercentImprovement,
      totalImprovement: row.totalSavingsPercentImprovement
    }
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
