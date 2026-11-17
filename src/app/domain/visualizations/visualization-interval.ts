import type { VisualizationChart } from './visualization-definition';

export function isExplorationChart(chart: VisualizationChart | undefined): chart is Extract<VisualizationChart, { kind: 'scatter' | 'correlation' | 'heatmap' }> {
  return !!chart && (chart.kind === 'scatter' || chart.kind === 'correlation' || chart.kind === 'heatmap');
}
/** Old setup intent defaults monthly; creation explicitly chooses annual Energy Use settings. */
export function visualizationInterval(chart: VisualizationChart | undefined): 'monthly' | 'yearly' | 'native' {
  return chart && 'interval' in chart ? chart.interval ?? 'monthly' : 'monthly';
}
export function explorationChartIssue(chart: VisualizationChart): string | undefined {
  return chart.kind === 'heatmap' && chart.dimension === 'month-year' && visualizationInterval(chart) !== 'monthly'
    ? 'Month-by-year heatmaps require monthly observations. Choose Series by time for annual data.' : undefined;
}
