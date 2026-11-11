import type { VisualizationChart } from '@domain/visualizations/visualization-definition';

export type VisualizationChartChoiceId = 'line' | 'bar' | 'area' | 'combination' | 'scatter' | 'correlation'
  | 'heatmap' | 'breakdown-bar' | 'donut' | 'treemap' | 'sankey';

/** Pure catalog: selecting setup intent never requires a provider or a calculation. */
export const VISUALIZATION_CHART_CHOICES: readonly { readonly value: VisualizationChartChoiceId; readonly label: string }[] = [
  { value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' }, { value: 'area', label: 'Area' },
  { value: 'combination', label: 'Combination' }, { value: 'scatter', label: 'Scatter' },
  { value: 'correlation', label: 'Correlation' }, { value: 'heatmap', label: 'Heatmap' },
  { value: 'breakdown-bar', label: 'Breakdown bar' }, { value: 'donut', label: 'Donut' },
  { value: 'treemap', label: 'Treemap' }, { value: 'sankey', label: 'Sankey' }
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
  if (!chart) return 'Chart not selected';
  const choice = chart.kind === 'time-series' ? chart.type
    : chart.kind === 'breakdown' ? chart.type === 'bar' ? 'breakdown-bar' : 'donut' : chart.kind;
  return VISUALIZATION_CHART_CHOICES.find(item => item.value === choice)!.label;
}
