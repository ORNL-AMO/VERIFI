import type { HomeBuiltInChartReference } from './home-dashboard';
import { createVisualizationDefinition, type VisualizationDefinition } from '../visualizations/visualization-definition';

/** Immutable, versioned configurations shared by Home and future explicit quick-create choices. */
export function buildHomeChart(reference: HomeBuiltInChartReference, accountGuid: string):
  | { readonly state: 'ready'; readonly definition: VisualizationDefinition }
  | { readonly state: 'unsupported'; readonly message: string } {
  const category = reference.recipe === 'reporting-energy-rolling' ? 'energy' : reference.recipe === 'reporting-water-rolling' ? 'water' : undefined;
  if (!category || reference.version !== 1)
    return { state: 'unsupported', message: 'This built-in chart recipe or version is unavailable. Its configuration is preserved.' };
  const owner = reference.owner;
  if (owner.kind === 'account' && owner.guid !== accountGuid)
    return { state: 'unsupported', message: 'This built-in chart belongs to another account.' };
  const base = createVisualizationDefinition(`${category === 'energy' ? 'Energy' : 'Water'} rolling improvement`, accountGuid,
    owner.kind === 'account' ? { kind: 'all' } : { kind: 'fixed', facilityGuids: [owner.guid] }, 'analysis');
  return { state: 'ready', definition: { ...base,
    sources: [{ id: 'reporting', kind: 'analysis', mode: 'result', measure: 'rolling-improvement', aggregation: 'none',
      reporting: { kind: 'reporting', owner: structuredClone(owner), category } }],
    series: [{ id: 'rolling-improvement', sourceId: 'reporting', metric: 'rolling-improvement', axis: 'left' }],
    chart: { kind: 'time-series', interval: 'monthly', defaultTraceType: 'line', stack: 'none' }, period: { kind: 'all-history' } } };
}
