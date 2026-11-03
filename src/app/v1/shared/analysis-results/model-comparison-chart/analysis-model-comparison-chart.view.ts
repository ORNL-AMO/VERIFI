import { AnalysisGroup } from '@data/models/analysis';
import { V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { formatRegressionNumber } from '../number/regression-number-format';

export interface AnalysisModelComparisonRow {
  readonly date: Date;
  readonly fiscalYear: number;
  readonly energyUse: number | null;
  readonly modeledEnergy: number | null;
}
export interface AnalysisModelComparisonData {
  readonly source: 'generated' | 'user-defined';
  readonly modelYear: number | undefined;
  readonly group: AnalysisGroup;
  readonly category: 'energy' | 'water';
  readonly unit?: string;
  readonly monthly: readonly AnalysisModelComparisonRow[];
  readonly comparison?: { readonly monthly: readonly AnalysisModelComparisonRow[] };
}

export function analysisModelComparisonChart(data: AnalysisModelComparisonData): V1EChartsOption | undefined {
  if (!data.monthly.length) return undefined;
  const category = data.category;
  const unit = data.unit;
  const rows = data.monthly;
  const modeledMeasure = category === 'water' ? 'consumption' : 'energy';
  const comparisonByMonth = data.comparison
    ? new Map(data.comparison.monthly.map(row => [analysisModelMonthKey(row.date), row.modeledEnergy]))
    : undefined;
  const period = analysisModelComparisonPeriod(data);
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: value => formatRegressionNumber(value)
    },
    legend: { top: 0, left: 'center' },
    grid: { top: 54, right: 18, bottom: rows.length > 24 ? 70 : 40, left: 54, containLabel: true },
    xAxis: {
      type: 'category',
      data: rows.map(row => new Date(row.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }))
    },
    yAxis: {
      type: 'value',
      name: unit || undefined,
      axisLabel: { formatter: value => formatRegressionNumber(value) }
    },
    dataZoom: rows.length > 24
      ? [{ type: 'inside', start: 0, end: 100 }, { type: 'slider', start: 0, end: 100, bottom: 12, height: 22 }]
      : [],
    series: [
      {
        name: category === 'water' ? 'Actual consumption' : 'Actual energy',
        type: 'scatter',
        symbol: 'rect',
        symbolSize: 8,
        data: rows.map(row => row.energyUse),
        itemStyle: { color: 'var(--v1-chart-series-3)' }
      },
      {
        name: data.comparison ? `Candidate modeled ${modeledMeasure}` : `Modeled ${modeledMeasure}`,
        type: 'line',
        showSymbol: true,
        symbolSize: 6,
        data: rows.map(row => row.modeledEnergy),
        lineStyle: { color: 'var(--v1-chart-series-1)', width: 3 },
        itemStyle: { color: 'var(--v1-chart-series-1)' },
        markArea: period ? {
          silent: true,
          itemStyle: { color: 'rgba(242, 106, 33, .10)' },
          data: [[
            { xAxis: period.start },
            { xAxis: period.end }
          ]]
        } : undefined
      },
      ...(data.comparison ? [{
        name: `Selected modeled ${modeledMeasure}`,
        type: 'line' as const,
        showSymbol: true,
        symbol: 'diamond',
        symbolSize: 7,
        data: rows.map(row => comparisonByMonth?.get(analysisModelMonthKey(row.date)) ?? null),
        lineStyle: { color: 'var(--v1-chart-series-2)', width: 3, type: 'dashed' as const },
        itemStyle: { color: 'var(--v1-chart-series-2)' }
      }] : [])
    ]
  } as V1EChartsOption;
}

export function analysisModelComparisonPeriod(data: AnalysisModelComparisonData): { start: number; end: number } | undefined {
  return data.source === 'user-defined' ? userDefinedPeriodIndices(data.monthly, data.group) : generatedPeriodIndices(data.monthly, data.modelYear);
}

export function analysisModelMonthKey(value: Date | string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function nearestPeriodIndex(rows: readonly { date: Date | string }[], target: Date): number {
  const targetTime = target.getTime();
  let closest = 0;
  rows.forEach((row, index) => {
    if (Math.abs(new Date(row.date).getTime() - targetTime) < Math.abs(new Date(rows[closest].date).getTime() - targetTime)) {
      closest = index;
    }
  });
  return closest;
}

function userDefinedPeriodIndices(
  rows: readonly AnalysisModelComparisonRow[],
  group: AnalysisGroup
): { start: number; end: number } | undefined {
  if (![group.regressionStartYear, group.regressionModelStartMonth, group.regressionEndYear, group.regressionModelEndMonth]
    .every(value => Number.isFinite(value))) return undefined;
  return {
    start: nearestPeriodIndex(rows, new Date(group.regressionStartYear, group.regressionModelStartMonth, 1)),
    end: nearestPeriodIndex(rows, new Date(group.regressionEndYear, group.regressionModelEndMonth, 1))
  };
}

function generatedPeriodIndices(
  rows: readonly AnalysisModelComparisonRow[],
  modelYear: number | undefined
): { start: number; end: number } | undefined {
  const indices = rows
    .map((row, index) => row.fiscalYear === modelYear ? index : -1)
    .filter(index => index >= 0);
  return indices.length ? { start: indices[0], end: indices[indices.length - 1] } : undefined;
}
