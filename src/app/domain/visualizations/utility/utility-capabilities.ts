import { isCompositionChart, compositionPresets } from '../visualization-composition';
import { isExplorationChart } from '../visualization-interval';
import type { UtilityVisualizationSource, VisualizationChart } from '../visualization-definition';
import type { VisualizationChartSupport, VisualizationSourceCapabilities } from '../visualization-source-provider';

export function utilityCapabilities(source: UtilityVisualizationSource): VisualizationSourceCapabilities {
  return { kind: 'utility', measures: ['energy', 'consumption', 'cost', 'location-emissions', 'market-emissions', 'charge'],
    aggregations: source.dataMode === 'billing-period' ? ['none'] : ['none', 'sum'],
    periods: ['all-history', 'fixed', 'rolling', 'fiscal-year', 'latest-saved-year'],
    comparisons: source.dataMode === 'billing-period' ? ['none'] : ['none', 'previous-period', 'previous-year', 'custom'],
    chartKinds: ['time-series', 'monthly-patterns', 'scatter', 'correlation', 'heatmap', 'breakdown', 'treemap', 'sunburst'], shapes: ['time-series', 'breakdown', 'hierarchy'], alignments: source.dataMode === 'billing-period' ? ['billing-occurrence'] : ['civil-month', 'civil-year', 'fiscal-interval', 'category', 'hierarchy'],
    // Setup definitions already carry owner bindings. Irrelevant owner bindings are inert;
    // pinned bindings still have to match resolved metadata in the compatibility check.
    settings: ['unit', 'energyTreatment', 'quantityUnits'],
    controls: ['series', 'appearance', 'axes', 'fit', 'normalization', 'hierarchy', 'denominator', ...(source.dataMode === 'calendarized' ? ['stacking' as const] : [])], allowDateOverride: true };
}

export function utilityChartSupport(source: UtilityVisualizationSource, chart: VisualizationChart): VisualizationChartSupport {
  const reasons: string[] = [];
  if (source.selection?.kind === 'rule' && source.selection.resource !== 'meter') reasons.push('Use a matching meter rule with explicit facility or group anchors. Other rule resource kinds are unavailable.');
  if (chart.kind !== 'time-series' && chart.kind !== 'monthly-patterns' && !isExplorationChart(chart) && !isCompositionChart(chart)) reasons.push('Choose a time-series or exploration chart.');
  if (chart.kind === 'monthly-patterns' && (source.dataMode !== 'calendarized' || !['energy', 'consumption', 'cost'].includes(source.measure))) reasons.push('Monthly patterns require calendarized energy, consumption or cost.');
  if (isCompositionChart(chart)) {
    if (source.dataMode !== 'calendarized' || source.measure === 'charge' || chart.kind === 'sankey') reasons.push('Utility composition requires calendarized additive values; native bills, charges and utility Sankey flows are unavailable.');
    if ((chart.kind === 'treemap' || chart.kind === 'sunburst') && ![...compositionPresets('utility'), ...compositionPresets('utility', true)].some(preset => JSON.stringify(preset.levels) === JSON.stringify(chart.hierarchy))) reasons.push('Choose a compatible utility hierarchy preset.');
  }
  if (isExplorationChart(chart) && source.dataMode !== 'calendarized') reasons.push('Exploration requires calendarized monthly or yearly observations. Native bill and charge pairing is unavailable.');
  if (chart.kind === 'time-series' && chart.stack !== 'none' && source.dataMode === 'billing-period') reasons.push('Native bill occurrences cannot be stacked. Choose calendarized monthly or yearly data.');
  if (source.measure === 'charge' && source.dataMode !== 'billing-period') reasons.push('Detailed charges are available as native bill observations only.');
  if (chart.kind === 'time-series' && ((source.dataMode === 'billing-period') !== (chart.interval === 'native'))) reasons.push('Choose Native for bill observations, or Monthly/Yearly for calendarized data.');
  if (source.dataMode === 'billing-period' && (source.aggregation !== 'none' || source.groupBy !== 'meter')) reasons.push('Native bills retain individual meter occurrences; grouped totals are unavailable.');
  if (source.aggregation === 'none' && source.groupBy !== 'meter') reasons.push('Separate meter observations require Meter grouping.');
  return reasons.length ? { chart, state: 'unsupported', reasons } : { chart, state: 'supported' };
}
