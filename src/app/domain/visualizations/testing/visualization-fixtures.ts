import { createVisualizationDefinition, VisualizationDefinition, VisualizationScope } from '../visualization-definition';

export function utilityVisualizationFixture(scope: VisualizationScope = { kind: 'portfolio' }): VisualizationDefinition {
  return { ...createVisualizationDefinition('Monthly energy', 'account-a', scope, 'utility'),
    sources: [{ id: 'utility', kind: 'utility', measure: 'energy', selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a'] },
      aggregation: 'sum', dataMode: 'calendarized', groupBy: 'meter', settings: { unit: { kind: 'pinned', value: 'kWh' }, energyTreatment: { kind: 'pinned', value: 'site' } } }],
    series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', resourceGuid: 'meter-a', label: 'Electricity', color: 'var(--v1-chart-series-1)', axis: 'left', lineStyle: 'solid' }],
    chart: { kind: 'time-series', type: 'line', interval: 'monthly', stack: 'none' } };
}

export function analysisVisualizationFixture(pinnedModel = false): VisualizationDefinition {
  return { ...createVisualizationDefinition('Analysis result', 'account-a', { kind: 'facility', facilityGuid: 'facility-a' }, 'analysis'),
    sources: pinnedModel
      ? [{ id: 'analysis', kind: 'analysis', mode: 'model', analysisGuid: 'analysis-a', groupGuid: 'group-a', modelId: 'model-a', comparisonModelId: 'model-b', measure: 'modeled', aggregation: 'none' }]
      : [{ id: 'analysis', kind: 'analysis', mode: 'result', analysisGuid: 'analysis-a', groupGuid: 'group-a', measure: 'actual', aggregation: 'none' }],
    series: [{ id: 'result', sourceId: 'analysis', metric: pinnedModel ? 'modeled' : 'actual', axis: 'left' }],
    chart: { kind: 'time-series', type: 'line', interval: 'monthly', stack: 'none' } };
}

export function energyUseVisualizationFixture(flow = false): VisualizationDefinition {
  return { ...createVisualizationDefinition('Equipment use', 'account-a', { kind: 'facility', facilityGuid: 'facility-a' }, 'energy-use'),
    sources: [{ id: 'equipment', kind: 'energy-use', measure: 'consumption', aggregation: 'sum', denominator: 'facility',
      selection: { kind: 'rule', resource: 'equipment', filter: { facilityGuids: ['facility-a'], includeRetired: false } } }],
    series: [{ id: 'consumption', sourceId: 'equipment', metric: 'consumption', axis: 'left' }],
    chart: flow ? { kind: 'sankey', flow: 'source-to-equipment' }
      : { kind: 'treemap', hierarchy: ['facility', 'group', 'equipment'], values: 'absolute' } };
}
