import type { VisualizationChart } from '@domain/visualizations/visualization-definition';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

export type VisualizationChartChoiceId = 'line' | 'bar' | 'area' | 'combination' | 'scatter' | 'correlation'
  | 'heatmap' | 'breakdown-bar' | 'donut' | 'treemap' | 'sankey';

/** Pure catalog: selecting setup intent never requires a provider or a calculation. */
export const VISUALIZATION_CHART_CHOICES: readonly { readonly value: VisualizationChartChoiceId; readonly label: string; readonly icon: IconName }[] = [
  { value: 'line', label: 'Line', icon: 'chartTimeSeries' }, { value: 'bar', label: 'Bar', icon: 'chartBar' },
  { value: 'area', label: 'Area', icon: 'chartTimeSeries' }, { value: 'combination', label: 'Combination', icon: 'chartTimeSeries' },
  { value: 'scatter', label: 'Scatter', icon: 'chartScatter' }, { value: 'correlation', label: 'Correlation', icon: 'covariate' },
  { value: 'heatmap', label: 'Heatmap', icon: 'heatmap' }, { value: 'breakdown-bar', label: 'Breakdown bar', icon: 'chartBar' },
  { value: 'donut', label: 'Donut', icon: 'chartDonut' }, { value: 'treemap', label: 'Treemap', icon: 'treemap' },
  { value: 'sankey', label: 'Sankey', icon: 'sankey' }
];

export function createVisualizationChart(choice: VisualizationChartChoiceId): VisualizationChart {
  switch (choice) {
    case 'line': case 'bar': case 'area': case 'combination':
      return { kind: 'time-series', type: choice, interval: 'native', stack: 'none' };
    case 'scatter': return { kind: 'scatter', showFit: false };
    case 'correlation': return { kind: 'correlation', statistic: 'r', scale: 'raw' };
    case 'heatmap': return { kind: 'heatmap', dimension: 'month-year', scale: 'linear' };
    case 'breakdown-bar': return { kind: 'breakdown', type: 'bar', values: 'absolute' };
    case 'donut': return { kind: 'breakdown', type: 'donut', values: 'absolute' };
    case 'treemap': return { kind: 'treemap', hierarchy: [], values: 'absolute' };
    case 'sankey': return { kind: 'sankey', flow: 'energy-balance' };
  }
}

export function visualizationChartLabel(chart: VisualizationChart | undefined): string {
  return visualizationChartChoice(chart)?.label ?? 'Chart not selected';
}

export function visualizationChartIcon(chart: VisualizationChart | undefined): IconName {
  return visualizationChartChoice(chart)?.icon ?? 'dataVisualization';
}

function visualizationChartChoice(chart: VisualizationChart | undefined) {
  if (!chart) return undefined;
  const choice = chart.kind === 'time-series' ? chart.type
    : chart.kind === 'breakdown' ? chart.type === 'bar' ? 'breakdown-bar' : 'donut' : chart.kind;
  return VISUALIZATION_CHART_CHOICES.find(item => item.value === choice);
}
