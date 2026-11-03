import { V1EChartsOption } from '@app/v1/shared/charts/echarts';
import { metricResultsChartOption } from '@app/v1/shared/charts/metric-results-chart/metric-results-chart-option';
import { AnalysisResultChartsView } from '../chart/analysis-result-chart.view';

/** The Report preview and exports use the same metric chart option builder. */
export function analysisResultChartOptions(view: AnalysisResultChartsView): {
  readonly use: V1EChartsOption;
  readonly improvement: V1EChartsOption;
} {
  const annual = view.period === 'annual';
  return {
    use: metricResultsChartOption({
      rows: [...view.useRows].sort((a, b) => a.sortValue - b.sortValue), metrics: view.useMetrics,
      leftMetricId: 'actual', rightMetricId: 'calculated',
      leftDisplay: annual ? 'bar' : 'line', rightDisplay: annual ? 'bar' : 'line',
      allMetrics: !annual, allMetricsDisplay: 'line', comparisonBand: view.comparisonBand,
      sharedYAxis: true, allowNegativeValues: true, showValueLabels: annual, compactValueLabels: annual,
      yAxisTitle: annual ? `${view.category === 'water' ? 'Consumption' : 'Energy Use'}${view.unit ? ` (${view.unit})` : ''}` : view.unit
    }),
    improvement: metricResultsChartOption({
      rows: [...view.improvementRows].sort((a, b) => a.sortValue - b.sortValue), metrics: view.improvementMetrics,
      leftMetricId: 'annualImprovement', rightMetricId: 'totalImprovement',
      allMetrics: !annual, allMetricsDisplay: 'bar', stackSeries: !annual,
      sharedYAxis: true, allowNegativeValues: true, showValueLabels: annual,
      yAxisTitle: annual ? 'Percent Improvement' : 'Percent Savings'
    })
  };
}
