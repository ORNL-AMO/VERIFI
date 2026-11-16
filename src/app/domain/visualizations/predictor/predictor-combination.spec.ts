import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { calendarizedMeter, meter, monthlyData, reading } from '@app/v1/data/meters/facility-meters.testing';
import { prepareTimeSeries } from '@app/v1/visualizations/time-series/time-series.presenter';
import { timeSeriesOption } from '@app/v1/visualizations/time-series/time-series-options';
import { checkVisualizationCompatibility } from '../visualization-capabilities';
import { utilityVisualizationFixture } from '../testing/visualization-fixtures';
import type { PredictorVisualizationSource, VisualizationDefinition } from '../visualization-definition';
import type { VisualizationSourceEvidence, VisualizationSourceRequest } from '../visualization-source-provider';
import { resolveCalendarizedUtility } from '../utility/utility-calendarized';
import { utilityCapabilities, utilityChartSupport } from '../utility/utility-capabilities';
import { predictorCapabilities, predictorChartSupport, resolvePredictor } from './predictor-source';
import { predictorCombinationSupported, wholeMonthWindow } from '../visualization-monthly-combination';

describe('monthly utility and predictor combination', () => {
  function setup() {
    const predictor = { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'p', name: 'Production', unit: 'widgets' };
    const snapshot = { ...visualizationSnapshot(), predictors: [predictor], meters: [meter({ meterReadingDataApplication: 'fullMonth' })],
      meterData: [reading({ totalEnergyUse: 5 })], predictorData: [{ ...getNewIdbPredictorData(predictor), guid: 'zero', year: 2026, month: 3, amount: 0 }] };
    const base = utilityVisualizationFixture();
    const source: PredictorVisualizationSource = { id: 'p-source', kind: 'predictor', measure: 'value', aggregation: 'none', selection: { kind: 'rule', resource: 'predictor', filter: {} } };
    const definition: VisualizationDefinition = { ...base, sources: [...base.sources, source],
      series: [...base.series, { id: 'production', sourceId: source.id, metric: 'value', axis: 'left' }] };
    const request: VisualizationSourceRequest = { identity: { accountGuid: 'account-a', definitionGuid: 'saved', definitionRevision: 1, workspaceRevision: 1, sourceId: base.sources[0].id,
      scope: { kind: 'facility', facilityGuid: 'facility-a', facilityGuids: ['facility-a'] }, requestId: 'combined' }, source: base.sources[0], chart: definition.chart!,
      period: definition.period, comparison: definition.comparison, series: definition.series.filter(series => series.sourceId === base.sources[0].id),
      dateContext: { calendarDate: '2026-11-16', monthlyRange: { start: '2026-01-01', end: '2026-03-31' } } };
    const canonical = calendarizedMeter(snapshot.meters[0], [monthlyData({ energyUse: 5, energyConsumption: 5 })], { energyUnit: 'kWh', consumptionUnit: 'kWh' });
    const resolve = (): VisualizationSourceEvidence[] => {
      const utility = request.source;
      if (utility.kind !== 'utility') throw new Error('Expected utility');
      const predictorRequest = { ...request, identity: { ...request.identity, sourceId: source.id }, source, series: definition.series.filter(series => series.sourceId === source.id) };
      return [{ request, capabilities: utilityCapabilities(utility), chartSupport: utilityChartSupport(utility, request.chart), resolution: resolveCalendarizedUtility(snapshot, request, [canonical]) },
        { request: predictorRequest, capabilities: predictorCapabilities(), chartSupport: predictorChartSupport(source, request.chart), resolution: resolvePredictor(snapshot, predictorRequest) }];
    };
    return { snapshot, definition, resolve, request, source };
  }
  it('renders independent values, gaps and original units on one axis without implicit conversion', () => {
    const { definition, resolve } = setup(), evidence = resolve();
    expect(checkVisualizationCompatibility(definition, evidence)).toMatchObject({ state: 'compatible' });
    const model = prepareTimeSeries(definition, evidence);
    expect(model.traces).toHaveLength(2); expect(model.slots).toHaveLength(3);
    expect(model.traces.map(trace => trace.axis)).toEqual(['left', 'left']);
    expect(model.traces[1].points.map(point => point.observation.state)).toEqual(['alignment-padding', 'alignment-padding', 'observed']);
    expect(model.traces[1].points[2].observation).toMatchObject({ value: 0 });
    expect((timeSeriesOption(model) as any).yAxis[0].name).toBe('');
  });
  it('retains valid empty sources with gaps and validates ownership before allowing partial rendering', () => {
    const { snapshot, definition, resolve } = setup();
    snapshot.predictors = []; snapshot.predictorData = [];
    const evidence = resolve();
    expect(evidence[1].resolution).toMatchObject({ state: 'empty', resolved: { series: [] } });
    expect(checkVisualizationCompatibility(definition, evidence)).toMatchObject({ state: 'compatible' });
    expect(prepareTimeSeries(definition, evidence).traces).toHaveLength(1);
    const fixed = { ...definition, sources: definition.sources.map(source => source.kind === 'predictor' ? { ...source, selection: { kind: 'fixed' as const, resource: 'predictor' as const, guids: ['deleted'] } } : source) };
    expect(checkVisualizationCompatibility(fixed, evidence).state).toBe('unavailable');
  });
  it('retains a known predictor with no readings as an explicit empty trace', () => {
    const { snapshot, definition, resolve } = setup(); snapshot.predictorData = [];
    const evidence = resolve();
    expect(checkVisualizationCompatibility(definition, evidence)).toMatchObject({ state: 'compatible' });
    const trace = prepareTimeSeries(definition, evidence).traces[1];
    expect(trace.points).toHaveLength(3);
    expect(trace.points.every(point => point.observation.state === 'alignment-padding')).toBe(true);
  });
  it('keeps native, yearly, comparison and extra-source configurations unavailable without changing intent', () => {
    const { definition } = setup(); const original = structuredClone(definition);
    expect(predictorCombinationSupported(definition)).toBe(true);
    expect(predictorCombinationSupported({ ...definition, comparison: { kind: 'previous-period' } })).toBe(false);
    expect(predictorCombinationSupported({ ...definition, chart: { kind: 'time-series', defaultTraceType: 'line', stack: 'none', interval: 'yearly' } })).toBe(false);
    expect(predictorCombinationSupported({ ...definition, sources: [...definition.sources, { ...definition.sources[1], id: 'extra' }] })).toBe(false);
    expect(predictorCombinationSupported({ ...definition, sources: definition.sources.map(source => source.kind === 'utility' ? { ...source, dataMode: 'billing-period' } : source) })).toBe(false);
    expect(wholeMonthWindow('2024-01-15', '2024-03-20')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(wholeMonthWindow('2024-01-15', '2024-01-20')).toBeUndefined();
    expect(definition).toEqual(original);
  });
});
