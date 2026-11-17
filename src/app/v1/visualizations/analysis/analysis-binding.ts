import type { AnalysisResultVisualizationSource, VisualizationDefinition } from '@domain/visualizations/visualization-definition';

/** Constructs exact intent after review, including a binding whose saved resource is now unavailable. */
export function replaceAnalysisBinding(definition: VisualizationDefinition, sourceId: string,
  binding: Pick<AnalysisResultVisualizationSource, 'analysisGuid' | 'groupGuid'>): VisualizationDefinition {
  const source = definition.sources.find(item => item.id === sourceId);
  if (source?.kind !== 'analysis') return definition;
  const measure = source.mode === 'result' && !source.measure.startsWith('banked-') ? source.measure : 'actual';
  const changed: AnalysisResultVisualizationSource = {
    id: source.id, kind: 'analysis', mode: 'result', measure, aggregation: 'none',
    ...(source.settings ? { settings: source.settings } : {}),
    ...(binding.analysisGuid ? { analysisGuid: binding.analysisGuid } : {}),
    ...(binding.groupGuid ? { groupGuid: binding.groupGuid } : {})
  };
  const series = definition.series.filter(item => item.sourceId !== sourceId);
  if (binding.analysisGuid) {
    let id = `${sourceId}-series`, index = 1;
    while (series.some(item => item.id === id)) id = `${sourceId}-series-${index++}`;
    series.push({ id, sourceId, metric: measure, resourceGuid: binding.groupGuid ?? binding.analysisGuid, axis: 'left' });
  }
  return { ...definition, sources: definition.sources.map(item => item.id === sourceId ? changed : item), series };
}
