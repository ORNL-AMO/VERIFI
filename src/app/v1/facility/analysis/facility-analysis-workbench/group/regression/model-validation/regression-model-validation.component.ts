import { Component, computed, input, output } from '@angular/core';
import { AnalysisGroup, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { RegressionModelValidationState } from '../regression-model-validation.service';
import { formatRegressionNumber } from '../regression-number-format';

@Component({
  selector: 'app-regression-model-validation',
  standalone: true,
  imports: [EChartsChartDirective, IconComponent],
  templateUrl: './regression-model-validation.component.html',
  styleUrls: ['./regression-model-validation.component.css']
})
export class RegressionModelValidationComponent {
  readonly state = input.required<RegressionModelValidationState>();
  readonly analysis = input.required<IdbAnalysisItem>();
  readonly group = input.required<AnalysisGroup>();
  readonly retryRequested = output<void>();

  readonly validationRows = computed(() => {
    const state = this.state();
    return state.state === 'ready' ? (state.model.SEPValidation ?? []).map(row => ({
      ...row,
      meanReportYearDisplay: formatRegressionNumber(row.meanReportYear),
      meanBaselineYearDisplay: formatRegressionNumber(row.meanBaselineYear),
      modelMinDisplay: formatRegressionNumber(row.modelMin),
      modelMaxDisplay: formatRegressionNumber(row.modelMax),
      modelMinus3StdDevDisplay: formatRegressionNumber(row.modelMinus3StdDev),
      modelPlus3StdDevDisplay: formatRegressionNumber(row.modelPlus3StdDev)
    })) : [];
  });
  readonly passed = computed(() => {
    const state = this.state();
    return state.state === 'ready' && state.model.SEPValidationPass === true;
  });
  readonly chartOption = computed<V1EChartsOption | undefined>(() => {
    const state = this.state();
    if (state.state !== 'ready' || state.monthly.length === 0) return undefined;
    const category = this.analysis().analysisCategory;
    const unit = category === 'water' ? this.analysis().waterUnit : this.analysis().energyUnit;
    const rows = state.monthly;
    const modeledMeasure = category === 'water' ? 'consumption' : 'energy';
    const comparisonByMonth = state.comparison
      ? new Map(state.comparison.monthly.map(row => [monthKey(row.date), row.modeledEnergy]))
      : undefined;
    const period = state.source === 'user-defined'
      ? userDefinedPeriodIndices(rows, this.group())
      : generatedPeriodIndices(rows, state.model.modelYear);
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
          name: state.comparison ? `Candidate modeled ${modeledMeasure}` : `Modeled ${modeledMeasure}`,
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
        ...(state.comparison ? [{
          name: `Selected modeled ${modeledMeasure}`,
          type: 'line' as const,
          showSymbol: true,
          symbol: 'diamond',
          symbolSize: 7,
          data: rows.map(row => comparisonByMonth?.get(monthKey(row.date)) ?? null),
          lineStyle: { color: 'var(--v1-chart-series-2)', width: 3, type: 'dashed' as const },
          itemStyle: { color: 'var(--v1-chart-series-2)' }
        }] : [])
      ]
    } as V1EChartsOption;
  });
}

function monthKey(value: Date | string): string {
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
  rows: readonly MonthlyAnalysisSummaryData[],
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
  rows: readonly MonthlyAnalysisSummaryData[],
  modelYear: number
): { start: number; end: number } | undefined {
  const indices = rows
    .map((row, index) => row.fiscalYear === modelYear ? index : -1)
    .filter(index => index >= 0);
  return indices.length ? { start: indices[0], end: indices[indices.length - 1] } : undefined;
}
