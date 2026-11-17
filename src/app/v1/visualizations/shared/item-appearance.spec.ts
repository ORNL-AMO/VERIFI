import { createVisualizationDefinition, type VisualizationDefinition, type VisualizationSeries } from '@domain/visualizations/visualization-definition';
import { findItemSeries, resolveItemPresentation } from './item-appearance';
import { visualizationSeriesStyle } from './series-style';

const identity = { resourceGuid: 'predictor-a' } as const;
const target = { sourceId: 'source-1', metric: 'value', identity, providerSeriesId: 'source-1:predictor:predictor-a' };
function definition(series: readonly VisualizationSeries[]): VisualizationDefinition {
  return { ...createVisualizationDefinition('Saved history', 'account-a', { kind: 'all' }, 'predictor'),
    chart: { kind: 'time-series', defaultTraceType: 'bar', interval: 'monthly', stack: 'none' }, series };
}
const wildcard: VisualizationSeries = { id: 'matching', sourceId: 'source-1', metric: 'value', axis: 'left' };

describe('configured item presentation', () => {
  it('selects the exact declaration before a wildcard and keeps metadata out of appearance', () => {
    const exact = { ...wildcard, id: 'exact', resourceGuid: identity.resourceGuid, label: 'Exact predictor', overrides: [{ resourceGuid: identity.resourceGuid, order: 2 }] };
    const value = definition([wildcard, exact]);
    expect(findItemSeries(value, target.sourceId, target.metric, identity)).toBe(exact);
    const result = resolveItemPresentation(value, target);
    expect(result.appearance).toMatchObject({ label: 'Exact predictor', traceType: 'bar', axis: 'left', visible: true, order: 2 });
    expect(result.declared).toEqual({ axis: 'left', label: 'Exact predictor' });
    expect(result.own).toEqual({ order: 2 });
    expect(result.appearance).not.toHaveProperty('id'); expect(result.appearance).not.toHaveProperty('overrides');
    expect(result.appearance).not.toHaveProperty('resourceGuid'); expect(result.appearance).not.toHaveProperty('accountGuid');
  });

  it('uses a resource override as a whole before the provider fallback', () => {
    const value = definition([{ ...wildcard, color: '#111111', traceType: 'line', overrides: [
      { seriesId: target.providerSeriesId, label: 'Provider', color: '#222222', visible: false },
      { resourceGuid: identity.resourceGuid, label: 'Resource' }
    ] }]);
    expect(resolveItemPresentation(value, target).appearance).toMatchObject({ label: 'Resource', color: '#111111', traceType: 'line', visible: true });
  });

  it('ignores foreign overrides and applies an owner-qualified provider fallback without changing intent', () => {
    const value = definition([{ ...wildcard, overrides: [
      { resourceGuid: identity.resourceGuid, label: 'Foreign resource', accountGuid: 'other-account' },
      { seriesId: target.providerSeriesId, label: 'Current provider', accountGuid: 'account-a', traceType: 'line' }
    ] }]);
    const before = structuredClone(value);
    expect(resolveItemPresentation(value, target).appearance).toMatchObject({ label: 'Current provider', traceType: 'line' });
    expect(value).toEqual(before);
  });

  it('keeps Analysis provider-local preferences dormant while applying its durable resource override', () => {
    const base = createVisualizationDefinition('Results', 'account-a', { kind: 'all' }, 'analysis');
    const value: VisualizationDefinition = { ...base, chart: definition([]).chart, series: [{ ...wildcard, metric: 'actual', overrides: [
      { seriesId: 'source-1:result', label: 'Dormant', traceType: 'line' },
      { resourceGuid: 'analysis-a', color: '#123456' }
    ] }] };
    const result = resolveItemPresentation(value,
      { sourceId: 'source-1', metric: 'actual', identity: { resourceGuid: 'analysis-a' }, providerSeriesId: 'source-1:result' });
    expect(result.appearance).toMatchObject({ color: '#123456', traceType: 'bar' });
    expect(result.appearance.label).toBeUndefined();
    const onlyProvider: VisualizationDefinition = { ...value, series: value.series.map(series => ({ ...series, overrides: series.overrides!.slice(0, 1) })) };
    expect(resolveItemPresentation(onlyProvider,
      { sourceId: 'source-1', metric: 'actual', identity: { resourceGuid: 'analysis-a' }, providerSeriesId: 'source-1:result' }).override).toBeUndefined();
  });

  it('supports category identity and retains explicit visibility and order', () => {
    const providerSeriesId = 'source-1:equipment-type:Pump';
    const value = definition([{ ...wildcard, overrides: [{ seriesId: providerSeriesId, visible: false, order: 0, traceType: 'line' }] }]);
    const result = resolveItemPresentation(value, { ...target, identity: { seriesId: providerSeriesId }, providerSeriesId });
    expect(result.appearance).toMatchObject({ visible: false, order: 0, traceType: 'line' });
    expect(result.appearance).not.toHaveProperty('seriesId');
  });

  it('provides stable defaults for a missing configured declaration', () => {
    const result = resolveItemPresentation(definition([]), target);
    expect(result.series).toBeUndefined(); expect(result.override).toBeUndefined();
    expect(result.appearance).toEqual({ ...visualizationSeriesStyle(target.providerSeriesId), traceType: 'bar', axis: 'left', visible: true });
  });
});
