import { annualAnalysisChartValues, monthlyAnalysisUseValues, monthlyAnalysisSavingsValues } from '@domain/calculations/analysis-calculations/analysis-chart-values';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { FacilityAnalysisGroupCalculationResult } from '@platform/web-workers/facility-analysis-results-worker.contract';
import {
  MeterResultsChartComparisonBand,
  MeterResultsChartMetric,
  MeterResultsChartRow
} from '@app/v1/shared/charts/metric-results-chart.models';

export const MONTHLY_USE_COMPARISON_BAND: MeterResultsChartComparisonBand = {
  referenceMetricId: 'actual',
  comparisonMetricId: 'calculated',
  comparisonAboveColor: 'var(--v1-success)',
  referenceAboveColor: 'var(--v1-danger)'
};

export interface MonthlySavingsChartView {
  readonly metrics: readonly MeterResultsChartMetric[];
  readonly rows: readonly MeterResultsChartRow[];
}

export interface AnalysisResultChartsView {
  readonly period: 'annual' | 'monthly';
  readonly category: 'energy' | 'water' | undefined;
  readonly unit: string | undefined;
  readonly useRows: readonly MeterResultsChartRow[];
  readonly useMetrics: readonly MeterResultsChartMetric[];
  readonly improvementRows: readonly MeterResultsChartRow[];
  readonly improvementMetrics: readonly MeterResultsChartMetric[];
  readonly comparisonBand?: MeterResultsChartComparisonBand;
}

export function annualResultChartsView(rows: readonly AnnualAnalysisSummary[], category: 'energy' | 'water' | undefined,
  unit: string | undefined): AnalysisResultChartsView {
  return { period: 'annual', category, unit, useRows: annualUseChartRows(rows), useMetrics: annualUseChartMetrics(category, unit),
    improvementRows: annualImprovementChartRows(rows), improvementMetrics: annualImprovementChartMetrics(category) };
}

export function monthlyResultChartsView(useRows: readonly MonthlyAnalysisSummaryData[], savingsRows: readonly MonthlyAnalysisSummaryData[],
  category: 'energy' | 'water' | undefined, unit: string | undefined, includeBanking: boolean): AnalysisResultChartsView {
  const savings = monthlySavingsChartView(savingsRows, includeBanking);
  return { period: 'monthly', category, unit, useRows: monthlyUseChartRows(useRows), useMetrics: monthlyUseChartMetrics(category, unit),
    improvementRows: savings.rows, improvementMetrics: savings.metrics, comparisonBand: MONTHLY_USE_COMPARISON_BAND };
}

export function facilityAnnualChartRows(rows: readonly AnnualAnalysisSummary[], groups: readonly FacilityAnalysisGroupCalculationResult[]): readonly AnnualAnalysisSummary[] {
  return rows.map(row => ({ ...row, isIntermediateBanked: groups.some(group =>
    group.annualAnalysisSummaryData.find(candidate => candidate.year === row.year)?.isIntermediateBanked) }));
}

export function facilityMonthlyChartRows(rows: readonly MonthlyAnalysisSummaryData[], groups: readonly FacilityAnalysisGroupCalculationResult[]): readonly MonthlyAnalysisSummaryData[] {
  return rows.map(row => ({ ...row, isIntermediateBanked: groups.some(group =>
    group.monthlyAnalysisSummaryData.find(candidate => new Date(candidate.date).getTime() === new Date(row.date).getTime())?.isIntermediateBanked) }));
}

export function annualImprovementChartMetrics(category: 'energy' | 'water' | undefined): readonly MeterResultsChartMetric[] {
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

export function annualUseChartMetrics(category: 'energy' | 'water' | undefined, unit: string | undefined): readonly MeterResultsChartMetric[] {
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
    periodKey: String(row.year), periodLabel: String(row.year), sortValue: row.year,
    values: { actual: annualAnalysisChartValues(row)['actual'], calculated: annualAnalysisChartValues(row)['calculated'] }
  }));
}

export function annualImprovementChartRows(rows: readonly AnnualAnalysisSummary[]): readonly MeterResultsChartRow[] {
  return rows.map(row => ({
    periodKey: String(row.year), periodLabel: String(row.year), sortValue: row.year,
    values: {
      annualImprovement: annualAnalysisChartValues(row)['annualImprovement'],
      totalImprovement: annualAnalysisChartValues(row)['totalImprovement']
    }
  }));
}

export function monthlyUseChartMetrics(category: 'energy' | 'water' | undefined, unit: string | undefined): readonly MeterResultsChartMetric[] {
  return category === 'water'
    ? [
      { id: 'actual', label: 'Actual Water Consumption', unit, color: 'var(--v1-muted)' },
      { id: 'calculated', label: 'Calculated Water Consumption', unit, color: 'var(--v1-chart-series-3)' }
    ]
    : [
      { id: 'actual', label: 'Actual Energy Use', unit, color: 'var(--v1-muted)' },
      { id: 'calculated', label: 'Calculated Energy Use', unit, color: 'var(--v1-chart-series-4)' }
    ];
}

export function monthlyUseChartRows(rows: readonly MonthlyAnalysisSummaryData[]): readonly MeterResultsChartRow[] {
  return rows.map(row => {
    const date = new Date(row.date);
    return {
      periodKey: `${date.getFullYear()}-${date.getMonth()}`,
      periodLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      sortValue: date.getTime(),
      values: monthlyAnalysisUseValues(row)
    };
  });
}

export function monthlySavingsChartView(rows: readonly MonthlyAnalysisSummaryData[], includeBanking: boolean): MonthlySavingsChartView {
  const metrics: readonly MeterResultsChartMetric[] = includeBanking
    ? [
      { id: 'bankedSavings', label: 'Banked Savings', unit: '%', color: 'var(--v1-chart-series-3)' },
      { id: 'bankedLosses', label: 'Banked Losses', unit: '%', color: 'var(--v1-danger)' },
      { id: 'savings', label: 'Savings', unit: '%', color: 'var(--v1-success)' },
      { id: 'losses', label: 'Losses', unit: '%', color: 'var(--v1-danger)' }
    ]
    : [
      { id: 'losses', label: 'Losses', unit: '%', color: 'var(--v1-danger)' },
      { id: 'savings', label: 'Savings', unit: '%', color: 'var(--v1-success)' }
    ];
  const values = monthlyAnalysisSavingsValues(rows, includeBanking);
  return { metrics, rows: rows.map((row, index) => {
    const date = new Date(row.date);
    return { periodKey: `${date.getFullYear()}-${date.getMonth()}`,
      periodLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      sortValue: date.getTime(), values: values[index] };
  }) };
}
