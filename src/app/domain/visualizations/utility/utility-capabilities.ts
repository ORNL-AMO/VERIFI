import type { UtilityVisualizationSource, VisualizationChart } from '../visualization-definition';
import type { VisualizationChartSupport, VisualizationSourceCapabilities } from '../visualization-source-provider';

export function utilityCapabilities(source: UtilityVisualizationSource): VisualizationSourceCapabilities {
  return { kind: 'utility', measures: ['energy', 'consumption', 'cost', 'location-emissions', 'market-emissions', 'charge'],
    aggregations: source.dataMode === 'billing-period' ? ['none'] : ['none', 'sum'],
    periods: ['all-history', 'fixed', 'rolling', 'fiscal-year', 'latest-saved-year'],
    comparisons: source.dataMode === 'billing-period' ? ['none'] : ['none', 'previous-period', 'previous-year', 'custom'],
    chartKinds: ['time-series'], shapes: ['time-series'], alignments: source.dataMode === 'billing-period' ? ['billing-occurrence'] : ['civil-month', 'civil-year', 'fiscal-interval'],
    // Setup definitions already carry owner bindings. Irrelevant owner bindings are inert;
    // pinned bindings still have to match resolved metadata in the compatibility check.
    settings: ['unit', 'energyTreatment'],
    controls: ['series', 'appearance', 'axes'], allowDateOverride: true };
}

export function utilityChartSupport(source: UtilityVisualizationSource, chart: VisualizationChart): VisualizationChartSupport {
  const reasons: string[] = [];
  if (source.selection?.kind === 'rule' && source.selection.resource !== 'meter') reasons.push('Use a matching meter rule with explicit facility or group anchors. Other rule resource kinds are unavailable.');
  if (chart.kind !== 'time-series' || !['line', 'bar'].includes(chart.type) || chart.stack !== 'none') reasons.push('Utility previews currently support unstacked line and bar charts.');
  if (source.measure === 'charge' && source.dataMode !== 'billing-period') reasons.push('Detailed charges are available as native bill observations only.');
  if (chart.kind === 'time-series' && ((source.dataMode === 'billing-period') !== (chart.interval === 'native'))) reasons.push('Choose Native for bill observations, or Monthly/Yearly for calendarized data.');
  if (source.dataMode === 'billing-period' && (source.aggregation !== 'none' || source.groupBy !== 'meter')) reasons.push('Native bills retain individual meter occurrences; grouped totals are unavailable.');
  if (source.aggregation === 'none' && source.groupBy !== 'meter') reasons.push('Separate meter observations require Meter grouping.');
  return reasons.length ? { chart, state: 'unsupported', reasons } : { chart, state: 'supported' };
}
