import { predictorChartSupport } from '@domain/visualizations/predictor/predictor-source';
import { facilityAnalysisChartSupport } from '@domain/visualizations/analysis/facility-analysis-source';
import { equipmentChartSupport } from '@domain/visualizations/energy-use/equipment-source';
import { equipmentDefinition } from '@domain/visualizations/testing/equipment-fixtures';
import { analysisDefinition } from '@domain/visualizations/testing/analysis-fixtures';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { observed, visualizationEvidenceFixture } from '@domain/visualizations/testing/visualization-provider-fixtures';
import { checkVisualizationCompatibility } from '@domain/visualizations/visualization-capabilities';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { VisualizationObservation, VisualizationSourceEvidence } from '@domain/visualizations/visualization-source-provider';
import { timeSeriesStackSettingsIssues } from '@domain/visualizations/visualization-time-series';
import { prepareTimeSeries, TimeSeriesPresenter } from './time-series.presenter';
import { timeSeriesOption } from './time-series-options';

function definition(stack: 'none' | 'absolute' | 'percent' = 'percent'): VisualizationDefinition {
  const base = utilityVisualizationFixture();
  return { ...base, sources: base.sources.map(source => source.kind === 'utility' ? { ...source,
    selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a', 'meter-b'] } } : source),
    chart: { kind: 'time-series', defaultTraceType: 'area', interval: 'monthly', stack },
    series: ['a', 'b'].map(id => ({ id, sourceId: 'utility', metric: 'energy', resourceGuid: `meter-${id}`, axis: 'left' })) };
}
function evidence(intent: VisualizationDefinition, a: VisualizationObservation = observed(25), b: VisualizationObservation = observed(75)): VisualizationSourceEvidence {
  const entry = visualizationEvidenceFixture(intent);
  if (entry.resolution.state !== 'ready' || entry.resolution.resolved.data.kind !== 'time-series') throw new Error('Expected fixture rows');
  return { ...entry, resolution: { ...entry.resolution, resolved: { ...entry.resolution.resolved,
    data: { kind: 'time-series', rows: entry.resolution.resolved.data.rows.map(row => ({ ...row, values: { a, b } })) } } } };
}

describe('time-series area, stacks and selected-contribution percentages', () => {
  it('adds area without loosening predictor or analysis stacking boundaries', () => {
    const chart = { kind: 'time-series' as const, defaultTraceType: 'area' as const, interval: 'monthly' as const, stack: 'none' as const };
    const predictor = { id: 'predictors', kind: 'predictor' as const, measure: 'value' as const, aggregation: 'none' as const, selection: { kind: 'fixed' as const, resource: 'predictor' as const, guids: ['predictor-a'] } };
    expect(predictorChartSupport(predictor, chart).state).toBe('supported');
    expect(predictorChartSupport(predictor, { ...chart, stack: 'absolute' }).state).toBe('unsupported');
    expect(facilityAnalysisChartSupport(analysisDefinition().sources[0], chart).state).toBe('supported');
    expect(facilityAnalysisChartSupport(analysisDefinition().sources[0], { ...chart, stack: 'percent' }).state).toBe('unsupported');
    const equipment = equipmentDefinition().sources[0]; if (equipment.kind !== 'energy-use') throw new Error();
    expect(equipmentChartSupport(equipment, { ...chart, interval: 'yearly', stack: 'percent' }).state).toBe('supported');
  });

  it.each(['line', 'bar', 'area'] as const)('renders compatible %s stacks through the existing renderer', type => {
    const intent: VisualizationDefinition = { ...definition('absolute'), chart: { kind: 'time-series', defaultTraceType: type, interval: 'monthly', stack: 'absolute' } };
    const entry = evidence(intent, observed(-5), observed(75)), before = structuredClone(entry);
    expect(checkVisualizationCompatibility(intent, [entry]).state).toBe('compatible');
    const option = timeSeriesOption(prepareTimeSeries(intent, [entry])) as any;
    expect(option.series.map(series => series.type)).toEqual([type === 'area' ? 'line' : type, type === 'area' ? 'line' : type]);
    expect(option.series[0]).toMatchObject({ stack: 'primary', stackStrategy: 'samesign', connectNulls: false });
    expect(!!option.series[0].areaStyle).toBe(type === 'area');
    expect(option.series[0].data[0][1]).toBe(-5); expect(entry).toEqual(before);
  });

  it('retains raw values and dates alongside independently normalized comparison percentages', () => {
    const intent: VisualizationDefinition = { ...definition(), comparison: { kind: 'previous-year', basis: 'calendar' } };
    const entry = evidence(intent), before = structuredClone(entry);
    if (entry.resolution.state !== 'ready' || entry.resolution.resolved.data.kind !== 'time-series') throw new Error();
    const amended = { ...entry, resolution: { ...entry.resolution, resolved: { ...entry.resolution.resolved,
      data: { kind: 'time-series' as const, rows: entry.resolution.resolved.data.rows.map(row => row.role === 'comparison'
        ? { ...row, values: { a: observed(80), b: observed(20) } } : row) } } } };
    const model = prepareTimeSeries(intent, [amended]);
    expect(model.traces.map(trace => trace.points[0].percentage)).toEqual([25, 80, 75, 20]);
    expect(model.traces[1].points[0].start).toBe('2024-01-01');
    const options = timeSeriesOption(model) as any;
    expect(options.series.map(series => series.stack)).toEqual(['primary', 'comparison', 'primary', 'comparison']);
    expect(options.yAxis[0]).toMatchObject({ min: 0, max: 100, name: '%' });
    const details = new TimeSeriesPresenter().prepare(intent, [amended], new AbortController().signal).details;
    expect(details.rows[0][4]).toContain('25 kWh'); expect(details.rows[0][4]).toContain('25%');
    expect(entry).toEqual(before);
  });

  it.each([
    { state: 'missing', value: null, reason: 'Missing bill' },
    { state: 'excluded', value: null, reason: 'Invalid bill' },
    { state: 'alignment-padding', value: null, reason: 'Outside history' },
    { ...observed(75), partial: true }
  ] as VisualizationObservation[])('leaves the complete percentage slot unavailable for $state evidence', point => {
    const intent = definition(), entry = evidence(intent, observed(25), point), before = structuredClone(entry);
    const model = prepareTimeSeries(intent, [entry]);
    expect(model.traces.every(trace => trace.points[0].percentage === null)).toBe(true);
    expect(model.traces[0].points[0].percentageReason).toContain('Incomplete comparable total');
    expect(model.traces[0].points[0].observation).toEqual(observed(25));
    expect(entry).toEqual(before);
  });

  it('distinguishes an observed zero share from a zero denominator and excludes hidden members', () => {
    const intent = definition();
    expect(prepareTimeSeries(intent, [evidence(intent, observed(0), observed(75))]).traces[0].points[0].percentage).toBe(0);
    expect(prepareTimeSeries(intent, [evidence(intent, observed(0), observed(0))]).traces[0].points[0]).toMatchObject({ percentage: null, percentageReason: expect.stringContaining('zero') });
    const hidden = { ...intent, series: intent.series.map((series, i) => i ? { ...series, visible: false } : series) };
    expect(prepareTimeSeries(hidden, [evidence(hidden)]).traces[0].points[0].percentage).toBe(100);
    const allHidden = { ...intent, series: intent.series.map(series => ({ ...series, visible: false })) };
    expect(checkVisualizationCompatibility(allHidden, [evidence(allHidden)]).state).toBe('compatible');
    expect(prepareTimeSeries(allHidden, [evidence(allHidden)]).traces).toEqual([]);
  });

  it('rejects negative percentage values while preserving the saved definition', () => {
    const intent = definition(), entry = evidence(intent, observed(-5));
    expect(checkVisualizationCompatibility(intent, [entry]).state).toBe('unavailable');
    expect(() => prepareTimeSeries(intent, [entry])).toThrow('nonnegative');
    expect(intent.chart).toMatchObject({ stack: 'percent' });
  });

  it.each([
    { axis: 'right' as const }, { traceType: 'bar' as const }
  ])('rejects a stack with incompatible visible presentation %j', change => {
    const base = definition('absolute'), intent = { ...base, series: base.series.map((series, index) => index ? { ...series, ...change } : series) };
    expect(checkVisualizationCompatibility(intent, [evidence(intent)]).state).toBe('unavailable');
  });

  it('requires additive, disjoint contributions with compatible units and treatment', () => {
    const intent = definition('absolute'), entry = evidence(intent);
    if (entry.resolution.state !== 'ready') throw new Error();
    for (const change of [{ additive: false }, { contributionKeys: ['meter-a:saved-contribution'] }, { unit: 'USD' }, { energyTreatment: 'source' as const }]) {
      const amended = { ...entry, resolution: { ...entry.resolution, resolved: { ...entry.resolution.resolved,
        series: entry.resolution.resolved.series.map((series, index) => index ? { ...series, ...change } : series) } } };
      expect(checkVisualizationCompatibility(intent, [amended]).state).toBe('unavailable');
    }
  });

  it('uses the same source restrictions in settings and runtime', () => {
    const intent = definition('absolute');
    const native = intent.sources.map(source => source.kind === 'utility' ? { ...source, dataMode: 'billing-period' as const } : source);
    expect(timeSeriesStackSettingsIssues(intent.chart!, native, intent.series).join(' ')).toContain('Native bill');
    expect(timeSeriesStackSettingsIssues(intent.chart!, [{ id: 'predictors', kind: 'predictor', measure: 'value', aggregation: 'none' }], intent.series).join(' ')).toContain('Predictor');
  });
});
