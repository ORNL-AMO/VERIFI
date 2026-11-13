import { describe, expect, it } from 'vitest';
import { createVisualizationSetupDefinition } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { createVisualizationChart, VISUALIZATION_CHART_CHOICES, visualizationChartIcon, visualizationChartLabel } from './visualization-charts';

describe('visualization chart choices', () => {
  it.each(VISUALIZATION_CHART_CHOICES)('retains $label as coherent incomplete setup intent', choice => {
    const chart = createVisualizationChart(choice.value);
    const value = createVisualizationSetupDefinition({ name: choice.label, accountGuid: 'account-a',
      facilitySelection: { kind: 'all' }, chart, sourceKinds: ['utility', 'predictor'] });
    const result = decodeVisualizationDefinition(JSON.parse(JSON.stringify(value)));
    expect(result.state).toBe('setup-required');
    expect('definition' in result && result.definition.chart).toEqual(chart);
    expect(value.series).toEqual([]);
    expect(visualizationChartLabel(chart)).toBe(choice.label);
    expect(visualizationChartIcon(chart)).toBe(choice.icon);
  });

  it('initializes settings independently and never fabricates Scatter axes or treemap levels', () => {
    expect(createVisualizationChart('line')).toEqual({ kind: 'time-series', defaultTraceType: 'line', interval: 'monthly', stack: 'none' });
    expect(createVisualizationChart('scatter')).toEqual({ kind: 'scatter', showFit: false });
    expect(createVisualizationChart('correlation')).toEqual({ kind: 'correlation', statistic: 'r', scale: 'raw' });
    expect(createVisualizationChart('heatmap')).toEqual({ kind: 'heatmap', dimension: 'month-year', scale: 'linear' });
    expect(createVisualizationChart('breakdown-bar')).toEqual({ kind: 'breakdown', type: 'bar', values: 'absolute' });
    expect(createVisualizationChart('sankey')).toEqual({ kind: 'sankey', flow: 'energy-balance' });
    const first = createVisualizationChart('treemap');
    const second = createVisualizationChart('treemap');
    expect(first).toEqual({ kind: 'treemap', hierarchy: [], values: 'absolute' });
    expect(first).not.toBe(second);
    if (first.kind === 'treemap' && second.kind === 'treemap') expect(first.hierarchy).not.toBe(second.hierarchy);
    expect(visualizationChartLabel(undefined)).toBe('Chart not selected');
    expect(visualizationChartIcon(undefined)).toBe('dataVisualization');
  });
});
