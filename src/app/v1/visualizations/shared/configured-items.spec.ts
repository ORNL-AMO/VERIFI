import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition, type VisualizationDefinition, type VisualizationSourceKind } from '@domain/visualizations/visualization-definition';
import { analysisDefinition, analysisFixture } from '@domain/visualizations/testing/analysis-fixtures';
import { equipmentDefinition, equipmentFixture } from '@domain/visualizations/testing/equipment-fixtures';
import { analysisVisualizationFixture, utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { buildVisualizationLibrary } from '../library/visualization-library.models';
import { configuredChartSummary, projectDecisionItems, visualizationDefinitionChartLabel } from './configured-items';

function snapshot(): AccountWorkspaceSnapshot {
  return { ...analysisFixture().snapshot, energyUseEquipment: [equipmentFixture()],
    predictors: [{ ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'predictor-a', name: 'Production' }] };
}
function configured(kind: VisualizationSourceKind): VisualizationDefinition {
  if (kind === 'utility') return utilityVisualizationFixture();
  if (kind === 'analysis') return analysisDefinition();
  if (kind === 'energy-use') return equipmentDefinition();
  const base = createVisualizationDefinition('Production history', 'account-a', { kind: 'all' }, 'predictor');
  return { ...base, chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'monthly', stack: 'none' },
    sources: [{ id: 'source-1', kind: 'predictor', measure: 'value', aggregation: 'none',
      selection: { kind: 'fixed', resource: 'predictor', guids: ['predictor-a'] } }],
    series: [{ id: 'production', sourceId: 'source-1', metric: 'value', axis: 'left' }] };
}

describe('configured source items and chart summaries', () => {
  it.each(['utility', 'predictor', 'energy-use', 'analysis'] as const)('describes %s item types independently of the chart default', kind => {
    const base = configured(kind), data = snapshot();
    expect(projectDecisionItems(base, base.sources[0].id, data)).toHaveLength(1);
    expect(configuredChartSummary(base, data)).toBe('Line');
    const changed = { ...base, series: base.series.map(series => ({ ...series, traceType: 'bar' as const })) };
    expect(configuredChartSummary(changed, data)).toBe('Bar');
    expect(configuredChartSummary({ ...base, chart: { kind: 'time-series', defaultTraceType: 'bar', interval: 'monthly', stack: 'none' } }, data)).toBe('Bar');
  });

  it.each(['utility', 'predictor', 'energy-use', 'analysis'] as const)('retains hidden and unavailable configured %s items in the summary', kind => {
    const base = configured(kind), data = snapshot();
    const changed = { ...base, series: base.series.map(series => ({ ...series, traceType: 'bar' as const, visible: false })) };
    const empty: AccountWorkspaceSnapshot = { ...data, meters: [], predictors: [], energyUseEquipment: [], facilityAnalyses: [], accountAnalyses: [] };
    const items = projectDecisionItems(changed, changed.sources[0].id, empty);
    expect(items).toHaveLength(1); expect(items[0]).toMatchObject({ missing: true, appearance: { visible: false, traceType: 'bar' } });
    expect(configuredChartSummary(changed, empty)).toBe('Bar');
  });

  it.each(['utility', 'predictor', 'energy-use', 'analysis'] as const)('preserves %s customization decisions for wildcard declarations', kind => {
    const base = configured(kind);
    const changed: VisualizationDefinition = { ...base, series: base.series.map(({ resourceGuid: _resourceGuid, ...series }) => ({ ...series, label: 'Inherited default' })) };
    const item = projectDecisionItems(changed, changed.sources[0].id, snapshot())[0];
    expect(item.appearance.label).toBe('Inherited default');
    expect(item.customized).toBe(kind !== 'utility');
  });

  it('summarizes all sources through the same dispatcher and keeps source order', () => {
    const utility = configured('utility'), analysis = configured('analysis');
    const combined: VisualizationDefinition = { ...utility, sources: [...utility.sources, ...analysis.sources],
      series: [...utility.series, ...analysis.series.map(series => ({ ...series, traceType: 'bar' as const }))] };
    expect(configuredChartSummary(combined, snapshot())).toBe('Combination');
    expect(combined.sources.flatMap(source => projectDecisionItems(combined, source.id, snapshot())).map(item => item.sourceId))
      .toEqual(['utility', 'source-1']);
    expect(projectDecisionItems(combined, 'missing', snapshot())).toEqual([]);
  });

  it('uses the default for no configured items and keeps unsupported model intent unavailable', () => {
    const base = createVisualizationDefinition('Future history', 'account-a', { kind: 'all' }, 'predictor');
    const empty: VisualizationDefinition = { ...base, chart: { kind: 'time-series', defaultTraceType: 'bar', interval: 'monthly', stack: 'none' } };
    expect(configuredChartSummary(empty, snapshot())).toBe('Bar');
    expect(configuredChartSummary({ ...empty, chart: { kind: 'scatter', showFit: false } }, snapshot())).toBeUndefined();
    const model = analysisVisualizationFixture(true), before = structuredClone(model);
    expect(projectDecisionItems(model, model.sources[0].id, snapshot())).toEqual([]);
    expect(configuredChartSummary(model, snapshot())).toBe('Line'); expect(model).toEqual(before);
  });

  it('falls back to the chart catalog label for non-time-series intent and missing definitions', () => {
    const base = configured('analysis');
    expect(visualizationDefinitionChartLabel({ ...base, chart: { kind: 'scatter', showFit: false } }, snapshot())).toBe('Scatter');
    expect(visualizationDefinitionChartLabel(undefined, snapshot())).toBe('Chart not selected');
  });

  it('reports an Analysis result item override in library labels', () => {
    const base = analysisDefinition();
    const definition = { ...base, series: base.series.map(series => ({ ...series, traceType: 'bar' as const })) };
    const data = { ...snapshot(), savedVisualizations: [{ ...getNewIdbSavedVisualization(definition), guid: 'saved-analysis' }] };
    expect(buildVisualizationLibrary(data)[0]).toMatchObject({ chartLabel: 'Bar', status: 'configured' });
  });
});
