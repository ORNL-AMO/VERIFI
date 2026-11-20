import type { HomeDisplayDefaults, HomeDisplayKey, HomeWidget } from './home-dashboard';
import type { VisualizationDefinition } from '../visualizations/visualization-definition';
import type { VisualizationSourceCapabilities } from '../visualizations/visualization-source-provider';
import { CHART_CAPABILITIES } from '../visualizations/visualization-capabilities';
import { decodeVisualizationDefinition } from '../visualizations/visualization-validation';
import { utilityMeasureKey } from '../visualizations/utility/utility-selection';

type ChartWidget = Extract<HomeWidget, { kind: 'visualization' | 'built-in-chart' }>;
/** Precedence is independent for each setting. No source identity or inclusion is accepted here. */
export function homeChartDisplay(widget: ChartWidget, dashboard: HomeDisplayDefaults, supportedUnits?: ReadonlySet<string>): HomeDisplayDefaults {
  const selected = (key: HomeDisplayKey) => widget.inherit.includes(key);
  const inheritedUnits = selected('units') && dashboard.displaySettings?.units ? Object.fromEntries(Object.entries(dashboard.displaySettings.units).filter(([quantity]) => !supportedUnits || supportedUnits.has(quantity))) : undefined;
  const explicitUnits = widget.overrides.displaySettings?.units;
  const units = inheritedUnits || explicitUnits ? { ...inheritedUnits, ...explicitUnits } : undefined;
  const energyTreatment = widget.overrides.displaySettings?.energyTreatment ?? (selected('energyTreatment') ? dashboard.displaySettings?.energyTreatment : undefined);
  const period = widget.overrides.period ?? (selected('period') ? dashboard.period : undefined);
  const emissionsTreatment = widget.overrides.emissionsTreatment ?? (selected('emissionsTreatment') ? dashboard.emissionsTreatment : undefined);
  return { ...(period ? { period } : {}), ...(units || energyTreatment ? { displaySettings: { ...(units ? { units } : {}), ...(energyTreatment ? { energyTreatment } : {}) } } : {}),
    ...(emissionsTreatment ? { emissionsTreatment } : {}) };
}
export function applyHomeChartDisplay(definition: VisualizationDefinition, display: HomeDisplayDefaults,
  capabilities: readonly VisualizationSourceCapabilities[]): { state: 'ready'; definition: VisualizationDefinition } | { state: 'unavailable'; message: string } {
  const reject = (message: string) => ({ state: 'unavailable' as const, message: message + ' Review the controls or explicitly use base settings.' });
  if (display.period && (!definition.chart || !CHART_CAPABILITIES[definition.chart.kind].allowDateOverride || capabilities.length !== definition.sources.length
    || capabilities.some(capability => !capability.allowDateOverride || !capability.periods.includes(display.period!.kind))))
    return reject('This chart does not support the requested dates.');
  if (display.displaySettings?.energyTreatment && definition.sources.some(source => source.kind === 'analysis'))
    return reject('Analysis energy basis is fixed by the saved analysis.');
  if (display.displaySettings?.energyTreatment && !definition.sources.some(source => source.kind === 'utility' && source.measure === 'energy'))
    return reject('Site/Source controls require utility energy.');
  if (display.emissionsTreatment && !definition.sources.some(source => source.kind === 'utility' && source.measure.endsWith('emissions')))
    return reject('Market/Location controls require an emissions measure.');
  const sources = definition.sources.map(source => source.kind === 'utility' && source.measure.endsWith('emissions') && display.emissionsTreatment
    ? { ...source, measure: display.emissionsTreatment === 'market' ? 'market-emissions' as const : 'location-emissions' as const } : source);
  const series = definition.series.map(series => {
    const old = definition.sources.find(source => source.id === series.sourceId), next = sources.find(source => source.id === series.sourceId);
    return old?.kind === 'utility' && next?.kind === 'utility' && old.measure !== next.measure
      ? { ...series, metric: series.metric === '*' ? '*' : utilityMeasureKey(next) } : series;
  });
  const candidate = { ...definition, sources, series, ...(display.period ? { period: display.period } : {}),
    ...(display.displaySettings ? { displaySettings: { ...definition.displaySettings, ...display.displaySettings,
      units: { ...definition.displaySettings?.units, ...display.displaySettings.units } } } : {}) };
  if (decodeVisualizationDefinition(candidate).state !== 'valid') return reject('These display settings are invalid for this chart.');
  return { state: 'ready', definition: candidate };
}
