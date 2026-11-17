import type { VisualizationChart, VisualizationDefinition } from '../visualization-definition';
import type { VisualizationSourceEvidence, VisualizationObservation } from '../visualization-source-provider';
import { utilityVisualizationFixture } from './visualization-fixtures';
import { visualizationEvidenceFixture, observed } from './visualization-provider-fixtures';
import { civilMonthRange } from '../visualization-periods';

export function explorationFixture(count = 3, chart: VisualizationChart = { kind: 'correlation', statistic: 'r', scale: 'raw' }): { definition: VisualizationDefinition; evidence: VisualizationSourceEvidence } {
  const ids = Array.from({ length: count }, (_, index) => String.fromCharCode(97 + index));
  const original = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] });
  const source = original.sources[0]; if (source.kind !== 'utility') throw new Error('Utility fixture expected');
  const definition: VisualizationDefinition = { ...original, chart, sources: [{ ...source, selection: { kind: 'fixed', resource: 'meter', guids: ids } }],
    series: ids.map(id => ({ id: 's-' + id, sourceId: source.id, metric: 'energy', resourceGuid: id, label: id.toUpperCase(), axis: 'left' })) };
  const base = visualizationEvidenceFixture(definition);
  if (base.resolution.state !== 'ready') throw new Error('Ready fixture expected');
  return { definition, evidence: { ...base, resolution: { ...base.resolution, resolved: { ...base.resolution.resolved,
    data: { kind: 'time-series', rows: Array.from({ length: 4 }, (_, month) => ({ periodKey: `2025-${month + 1}`, ...civilMonthRange(2025 * 12 + month),
      values: Object.fromEntries(ids.map((id, index) => ['s-' + id, observed(index === 2 ? 4 - month : index === 3 ? 8 : (month + 1) * (index + 1))])) })) } } } } };
}
export function withExplorationObservation(evidence: VisualizationSourceEvidence, seriesId: string, month: number, value: VisualizationObservation): VisualizationSourceEvidence {
  if (evidence.resolution.state !== 'ready' || evidence.resolution.resolved.data.kind !== 'time-series') throw new Error('Ready observations expected');
  return { ...evidence, resolution: { ...evidence.resolution, resolved: { ...evidence.resolution.resolved,
    data: { kind: 'time-series', rows: evidence.resolution.resolved.data.rows.map((row, index) => index === month ? { ...row, values: { ...row.values, [seriesId]: value } } : row) } } } };
}
