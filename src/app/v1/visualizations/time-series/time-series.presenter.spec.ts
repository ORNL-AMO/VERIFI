import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { observed, visualizationEvidenceFixture } from '@domain/visualizations/testing/visualization-provider-fixtures';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceEvidence, ResolvedVisualizationSeries } from '@domain/visualizations/visualization-source-provider';
import { prepareTimeSeries, TimeSeriesPresenter } from './time-series.presenter';

function ready(definition = utilityVisualizationFixture()): VisualizationSourceEvidence {
  return visualizationEvidenceFixture(definition);
}
function appendSeries(evidence: VisualizationSourceEvidence, metadata: ResolvedVisualizationSeries): VisualizationSourceEvidence {
  if (evidence.resolution.state !== 'ready') throw new Error('Fixture must be ready.');
  return { ...evidence, resolution: { ...evidence.resolution, resolved: { ...evidence.resolution.resolved, series: [...evidence.resolution.resolved.series, metadata] } } };
}

describe('saved time-series presentation', () => {
  it('keeps observed zero, original comparison dates and actual quality in accessible details', () => {
    const definition = { ...utilityVisualizationFixture(), comparison: { kind: 'previous-year' as const, basis: 'calendar' as const } };
    const presentation = new TimeSeriesPresenter().prepare(definition, [ready(definition)], new AbortController().signal);
    expect(presentation.details.rows).toHaveLength(2);
    expect(presentation.details.rows[0]).toEqual(['Electricity', 'primary', '2025-01-01', '2025-01-28', '0 kWh · measured']);
    expect(presentation.details.rows[1]).toContain('2024-01-01');
    const model = prepareTimeSeries(definition, [ready(definition)]);
    expect(model.traces[0].points[0].slot).toBe(model.traces[1].points[0].slot);
  });
  it('keeps colors stable when a new earlier-sorting live member arrives and retains visibility overrides', () => {
    const definition: VisualizationDefinition = { ...utilityVisualizationFixture(), series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left', overrides: [{ resourceGuid: 'hidden', visible: false }] }] };
    const evidence = ready(definition);
    if (evidence.resolution.state !== 'ready') throw new Error('Fixture must be ready.');
    const original = { ...evidence.resolution.resolved.series[0], id: 'z-meter', resourceGuid: 'meter-z' };
    const first = { ...evidence, resolution: { ...evidence.resolution, resolved: { ...evidence.resolution.resolved, series: [original] } } };
    const next = appendSeries(appendSeries(first, { ...original, id: 'a-meter', resourceGuid: 'meter-a' }), { ...original, id: 'hidden-meter', resourceGuid: 'hidden' });
    const before = prepareTimeSeries(definition, [first]);
    const after = prepareTimeSeries(definition, [next]);
    expect(after.traces).toHaveLength(2);
    expect(after.traces.find(trace => trace.id === 'z-meter:primary')?.color).toBe(before.traces[0].color);
    expect(after.traces.find(trace => trace.id === 'z-meter:primary')?.lineStyle).toEqual(before.traces[0].lineStyle);
  });
  it('explains overlapping comparisons and blocks incompatible units on the same axis', () => {
    const definition: VisualizationDefinition = { ...utilityVisualizationFixture(), series: [utilityVisualizationFixture().series[0], { id: 'cost', sourceId: 'utility', metric: 'cost', axis: 'left' }] };
    const evidence = ready(definition);
    expect(() => prepareTimeSeries(definition, [appendSeries(evidence, { id: 'cost', sourceId: 'utility', metric: 'cost', label: 'Cost', unit: 'USD', dimension: 'currency', currency: 'USD', additive: true })])).toThrow('compatible');
    const overlapping: VisualizationDefinition = { ...utilityVisualizationFixture(), series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left' }] };
    const base = ready(overlapping);
    if (base.resolution.state !== 'ready') throw new Error('Fixture must be ready.');
    const metadata = base.resolution.resolved.series[0];
    expect(prepareTimeSeries(overlapping, [appendSeries(base, { ...metadata, id: 'second', resourceGuid: 'second' })]).warnings.join(' ')).toContain('overlap');
  });
  it('preserves missing and partial observations without changing values or source evidence', () => {
    const definition = utilityVisualizationFixture(), evidence = ready(definition);
    if (evidence.resolution.state !== 'ready' || evidence.resolution.resolved.data.kind !== 'time-series') throw new Error('Fixture must be time-series.');
    const amended: VisualizationSourceEvidence = { ...evidence, resolution: { ...evidence.resolution, resolved: { ...evidence.resolution.resolved,
      quality: { partial: true, warnings: ['Meter B omitted: invalid bill'] }, data: { kind: 'time-series', rows: [
        { periodKey: 'jan', start: '2025-01-01', end: '2025-01-31', values: { energy: { state: 'observed', value: 10, provenance: 'measured', partial: true } } },
        { periodKey: 'feb', start: '2025-02-01', end: '2025-02-28', values: { energy: { state: 'missing', value: null, reason: 'Invalid cost input' } } }
      ] } } } };
    const snapshot = structuredClone(amended);
    const presentation = new TimeSeriesPresenter().prepare(definition, [amended], new AbortController().signal);
    expect(presentation.details.rows[0][4]).toContain('partial subtotal');
    expect(presentation.details.rows[1][4]).toBe('missing: Invalid cost input');
    expect(amended).toEqual(snapshot);
  });
  it('resolves each item type independently and applies it to the comparison trace', () => {
    const original = utilityVisualizationFixture();
    const definition: VisualizationDefinition = { ...original, comparison: { kind: 'previous-year', basis: 'calendar' }, series: [
      { id: 'energy', sourceId: original.sources[0].id, metric: 'energy', axis: 'left', traceType: 'line',
        overrides: [{ resourceGuid: 'meter-a', traceType: 'bar' }] }
    ] };
    const evidence = ready(definition);
    if (evidence.resolution.state !== 'ready') throw new Error('Fixture must be ready.');
    const first = { ...evidence.resolution.resolved.series[0], resourceGuid: 'meter-a' };
    const second = { ...first, id: 'second-meter', resourceGuid: 'meter-b' };
    const amended = { ...evidence, resolution: { ...evidence.resolution, resolved: { ...evidence.resolution.resolved, series: [first, second] } } };
    const model = prepareTimeSeries(definition, [amended]);
    expect(model.traces.filter(trace => trace.id.startsWith(first.id + ':')).map(trace => trace.type)).toEqual(['bar', 'bar']);
    expect(model.traces.filter(trace => trace.id.startsWith('second-meter:')).map(trace => trace.type)).toEqual(['line', 'line']);
  });
  it('rejects unsupported styles and aborted presentation', () => {
    const definition = utilityVisualizationFixture();
    expect(() => prepareTimeSeries({ ...definition, chart: { kind: 'time-series', defaultTraceType: 'area', interval: 'monthly', stack: 'none' } }, [ready(definition)])).toThrow('line or bar');
    const abort = new AbortController(); abort.abort();
    expect(() => new TimeSeriesPresenter().prepare(definition, [ready(definition)], abort.signal)).toThrow('canceled');
  });
});
