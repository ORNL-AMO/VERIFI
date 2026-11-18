import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import type { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { createVisualizationDefinition, type PredictorVisualizationSource, type VisualizationDefinition } from '../visualization-definition';
import type { VisualizationSourceRequest } from '../visualization-source-provider';
import { checkVisualizationCompatibility } from '../visualization-capabilities';
import { predictorCatalog, predictorCapabilities, predictorChartSupport, latestPredictorDate, resolvePredictor, resolvePredictorSelection, predictorHistoryRange } from './predictor-source';
import { prepareMonthlyPatterns } from '@app/v1/visualizations/monthly-patterns/monthly-patterns.presenter';

function setup() {
  const predictor = { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'predictor-a', name: 'Production', unit: 'widgets' };
  const snapshot = { ...visualizationSnapshot(), predictors: [predictor], predictorData: [] as IdbPredictorData[] };
  const source: PredictorVisualizationSource = { id: 'predictor', kind: 'predictor', measure: 'value', aggregation: 'none',
    settings: { unit: { kind: 'owner' } }, selection: { kind: 'fixed', resource: 'predictor', guids: [predictor.guid] } };
  const definition: VisualizationDefinition = { ...createVisualizationDefinition('Production', 'account-a', { kind: 'fixed', facilityGuids: ['facility-a'] }, 'predictor'),
    sources: [source], series: [{ id: 'intent', sourceId: source.id, metric: 'value', axis: 'left' }],
    chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'monthly', stack: 'none' } };
  const request: VisualizationSourceRequest = { identity: { accountGuid: 'account-a', definitionGuid: 'saved', definitionRevision: 1, workspaceRevision: 1,
    requestId: 'request', sourceId: source.id, scope: { kind: 'facility', facilityGuid: 'facility-a', facilityGuids: ['facility-a'] } },
    source, series: definition.series, chart: definition.chart!, period: definition.period, comparison: definition.comparison, dateContext: { calendarDate: '2026-03-15' } };
  const reading = (month: number, amount: number, guid = `reading-${month}`): IdbPredictorData => ({ guid, accountId: 'account-a', facilityId: 'facility-a',
    predictorId: predictor.guid, year: 2024, month, amount, weatherDataWarning: false, weatherOverride: false } as IdbPredictorData);
  return { snapshot, predictor, definition, request, source, reading };
}

describe('saved monthly predictor projection', () => {
  it.each(['Standard', 'Weather'] as const)('aligns a single saved %s predictor to facility fiscal years without changing value or gap meaning', predictorType => {
    const { snapshot, definition: initial, request: original, source, reading } = setup();
    snapshot.predictors = snapshot.predictors.map(predictor => ({ ...predictor, predictorType }));
    snapshot.facilities = snapshot.facilities.map(facility => ({ ...facility, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true }));
    snapshot.predictorData = [reading(7, 0), reading(9, -2)];
    const definition = { ...initial, chart: { kind: 'monthly-patterns' as const } }, request = { ...original, chart: definition.chart };
    const resolution = resolvePredictor(snapshot, request);
    const evidence = [{ request, capabilities: predictorCapabilities(), chartSupport: predictorChartSupport(source, request.chart), resolution }];
    expect(checkVisualizationCompatibility(definition, evidence).state).toBe('compatible');
    const model = prepareMonthlyPatterns(definition, evidence);
    expect(model.months[0]).toBe('Jul'); expect(model.years[0].label).toBe('FY 2025'); expect(model.panels).toHaveLength(1);
    expect(model.panels[0].years[0].points.slice(0, 3).map(point => point.observation)).toMatchObject([
      { state: 'observed', value: 0 }, { state: 'missing', value: null }, { state: 'observed', value: -2 }
    ]);
    expect(predictorChartSupport({ ...source, selection: { kind: 'rule', resource: 'predictor', filter: {} } }, request.chart).state).toBe('unsupported');
  });
  it.each(['observed', 'duplicate', 'nonfinite'] as const)('retains saved reading notes in %s runtime evidence without changing records', state => {
    const { snapshot, request, reading } = setup();
    const note = 'Estimated from downtime log; verify before analysis';
    snapshot.predictorData = [{ ...reading(1, state === 'nonfinite' ? NaN : 5), notes: `  ${note}  ` },
      ...(state === 'duplicate' ? [reading(1, 7, 'duplicate')] : [])];
    const before = structuredClone(snapshot.predictorData), result = resolvePredictor(snapshot, request);
    if (state === 'observed') {
      expect(result.state).toBe('ready');
      if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') throw new Error('Expected observed annotation');
      expect(Object.values(result.resolved.data.rows[0].values)[0]).toMatchObject({ state: 'observed', value: 5, partial: false, notes: [note] });
    } else {
      expect(result).toMatchObject({ state: 'empty', reasons: expect.arrayContaining([expect.stringContaining(note)]) });
    }
    expect(snapshot.predictorData).toEqual(before);
  });
  it('resolves 150,000 saved months without an argument-count limit', () => {
    const { snapshot, predictor, source, request, reading } = setup();
    snapshot.predictors = Array.from({ length: 2500 }, (_, index) => ({ ...predictor, guid: `predictor-${index}` }));
    snapshot.predictorData = snapshot.predictors.flatMap(record => Array.from({ length: 60 }, (_, index) => ({
      ...reading(index % 12 + 1, index), guid: `${record.guid}-${index}`, predictorId: record.guid, year: 2020 + Math.floor(index / 12)
    })));
    const all: PredictorVisualizationSource = { ...source, selection: { kind: 'rule', resource: 'predictor', filter: {} } };
    expect(predictorHistoryRange(snapshot, request.identity.scope, all))
      .toEqual({ start: '2020-01-01', end: '2024-12-31' });
    expect(latestPredictorDate(snapshot, request.identity.scope, all)).toBe('2024-12-31');
    const result = resolvePredictor(snapshot, { ...request, source: all });
    expect(result.state).toBe('ready');
    if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') throw new Error('Expected large saved history');
    expect(result.resolved.series).toHaveLength(2500);
    expect(result.resolved.data.rows).toHaveLength(60);
    expect(result.resolved.data.rows[0]).toMatchObject({ start: '2020-01-01', values: { 'predictor:predictor:predictor-0': { state: 'observed', value: 0 } } });
    expect(result.resolved.data.rows.at(-1)).toMatchObject({ end: '2024-12-31', values: { 'predictor:predictor:predictor-2499': { state: 'observed', value: 59 } } });
  });
  it('retains every excluded reading in a large duplicate month without an argument-count limit', () => {
    const { snapshot, request, reading } = setup();
    snapshot.predictorData = Array.from({ length: 150000 }, (_, index) => reading(1, index, `duplicate-${String(index).padStart(6, '0')}`));
    const result = resolvePredictor(snapshot, request);
    expect(result.state).toBe('empty');
    if (result.state !== 'empty') throw new Error('Expected duplicate-month exclusion');
    expect(result.reasons?.[0]).toContain('duplicate-000000: 0');
    expect(result.reasons?.[0]).toContain('duplicate-149999: 149999');
    expect(snapshot.predictorData).toHaveLength(150000);
  });
  it('keeps history bounds separate from eligible latest values and excludes unowned or invalid months', () => {
    const { snapshot, predictor, source, request, reading } = setup();
    snapshot.predictors.push({ ...predictor, guid: 'unselected' }, { ...predictor, guid: 'foreign', accountId: 'other' });
    snapshot.predictorData = [reading(1, 2), reading(1, 3, 'duplicate'), reading(3, NaN),
      { ...reading(1, 1, 'foreign-account'), year: 2010, accountId: 'other' },
      { ...reading(1, 1, 'foreign-facility'), year: 2011, facilityId: 'other' },
      { ...reading(1, 1, 'foreign-predictor'), year: 2012, predictorId: 'foreign' },
      { ...reading(1, 1, 'unselected'), year: 2013, predictorId: 'unselected' },
      { ...reading(13, 1), year: 2014 }, { ...reading(1, 1), year: 0 }];
    expect(predictorHistoryRange(snapshot, request.identity.scope, source)).toEqual({ start: '2024-01-01', end: '2024-03-31' });
    expect(latestPredictorDate(snapshot, request.identity.scope, source)).toBeUndefined();
    snapshot.predictorData = [];
    expect(predictorHistoryRange(snapshot, request.identity.scope, source)).toBeUndefined();
  });
  it('resolves live All within owned facilities without rewriting intent; fixed selections remain exact', () => {
    const { snapshot, predictor, source, reading, request } = setup();
    const all: PredictorVisualizationSource = { ...source, selection: { kind: 'rule', resource: 'predictor', filter: {} } };
    const original = structuredClone(all);
    snapshot.predictors = [];
    expect(resolvePredictorSelection(snapshot, request.identity.scope, all)).toEqual([]);
    expect(resolvePredictor(snapshot, { ...request, source: all }).state).toBe('empty');
    snapshot.predictors = [predictor, { ...predictor, guid: 'new', name: 'Weather', predictorType: 'Weather', noLongerInUse: true },
      { ...predictor, guid: 'math', predictorType: 'Math' }, { ...predictor, guid: 'foreign', accountId: 'other' }, { ...predictor, guid: 'outside', facilityId: 'other' }];
    snapshot.predictorData = [reading(1, 4), { ...reading(4, 0, 'new-zero'), predictorId: 'new', weatherDataWarning: true }];
    expect(resolvePredictorSelection(snapshot, request.identity.scope, all)).toEqual(['predictor-a', 'new']);
    expect(resolvePredictorSelection(snapshot, request.identity.scope, source)).toEqual(['predictor-a']);
    expect(latestPredictorDate(snapshot, request.identity.scope, all)).toBe('2024-04-30');
    expect(predictorHistoryRange(snapshot, request.identity.scope, all)).toEqual({ start: '2024-01-01', end: '2024-04-30' });
    expect(all).toEqual(original);
  });
  it('supplies resolved gaps for an empty All catalog and excluded histories when a companion supplies a window', () => {
    const { snapshot, request, source, reading } = setup();
    const dateContext = { ...request.dateContext, monthlyRange: { start: '2024-01-01', end: '2024-03-31' } };
    snapshot.predictors = [];
    expect(resolvePredictor(snapshot, { ...request, dateContext, source: { ...source, selection: { kind: 'rule', resource: 'predictor', filter: {} } } }))
      .toMatchObject({ state: 'empty', resolved: { series: [], alignment: { key: 'YYYY-MM' } } });
    const restored = setup();
    restored.snapshot.predictorData = [reading(1, 2, 'a'), reading(1, 3, 'b'), reading(3, NaN)];
    const result = resolvePredictor(restored.snapshot, { ...request, dateContext });
    expect(result).toMatchObject({ state: 'empty', resolved: { series: [{ resourceGuid: 'predictor-a' }], quality: { omissions: expect.any(Array) } } });
    if (result.state !== 'empty' || result.resolved?.data.kind !== 'time-series') throw new Error('Expected gap evidence');
    expect(result.resolved.data.rows.map(row => Object.values(row.values)[0].state)).toEqual(['excluded', 'missing', 'excluded']);
  });
  it.each([
    ['HDD', 'days', 'Heating base not set'], ['CDD', 'days', 'Cooling base not set'], ['relativeHumidity', '%', 'relativeHumidity'],
    ['dryBulbTemp', '°F', 'dryBulbTemp'], ['wetBulbTemp', '°F', 'wetBulbTemp'], ['dewPointTemp', '°F', 'dewPointTemp'], ['precipitation', 'in', 'precipitation']
  ] as const)('preserves saved %s values and context with fallback %s, without warning noise', (measure, unit, context) => {
    const { snapshot, predictor, request, reading } = setup();
    snapshot.predictors = [{ ...predictor, predictorType: 'Weather', weatherDataType: measure, unit: '',
      weatherStationName: '', weatherStationId: '', heatingBaseTemperature: undefined, coolingBaseTemperature: undefined, canBeNegative: true, ignoreWeatherDataWarning: true }];
    snapshot.predictorData = [{ ...reading(1, -3.125), weatherDataChanged: true, weatherOverride: true, weatherDataWarning: true }, reading(2, 0)];
    const before = structuredClone(snapshot);
    const result = resolvePredictor(snapshot, request);
    if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') throw new Error('Expected weather values');
    expect(result.resolved.series[0].unit).toBe(unit);
    expect(Object.values(result.resolved.data.rows[0].values)[0]).toMatchObject({ state: 'observed', value: -3.125,
      notes: expect.arrayContaining(['Saved weather warning', 'Saved weather data changed', 'Manual weather override', expect.stringContaining(context), expect.stringContaining('Station not set')]) });
    expect(Object.values(result.resolved.data.rows[1].values)[0]).toMatchObject({ state: 'observed', value: 0 });
    expect(result.resolved.quality.warnings).toEqual([]);
    expect(snapshot).toEqual(before);
    snapshot.predictors[0] = { ...snapshot.predictors[0], unit: 'saved-unit', weatherStationId: 'station-id', heatingBaseTemperature: 0, coolingBaseTemperature: 63 };
    const saved = resolvePredictor(snapshot, request);
    if (saved.state !== 'ready' || saved.resolved.data.kind !== 'time-series') throw new Error('Expected saved units');
    expect(saved.resolved.series[0].unit).toBe('saved-unit');
    expect(Object.values(saved.resolved.data.rows[0].values)[0]).toMatchObject({ notes: expect.arrayContaining([expect.stringContaining('station-id')]) });
    if (measure === 'HDD') expect(Object.values(saved.resolved.data.rows[0].values)[0]).toMatchObject({ notes: expect.arrayContaining([expect.stringContaining('0°F heating base')]) });
    if (measure === 'CDD') expect(Object.values(saved.resolved.data.rows[0].values)[0]).toMatchObject({ notes: expect.arrayContaining([expect.stringContaining('63°F cooling base')]) });
  });
  it('groups invalid readings by predictor and issue without losing flags or evidence in ready and empty previews', () => {
    const { snapshot, predictor, request, reading } = setup();
    snapshot.predictors = [{ ...predictor, predictorType: 'Weather', weatherDataType: 'CDD', weatherStationName: 'Saved station', coolingBaseTemperature: 65 }];
    snapshot.predictorData = [reading(1, 0), { ...reading(13, 20, 'invalid-a'), weatherDataWarning: true },
      { ...reading(14, 30, 'invalid-b'), weatherDataChanged: true }, { ...reading(2, Infinity, 'nonfinite'), weatherOverride: true },
      { ...reading(3, 3, 'duplicate-a'), weatherOverride: true }, { ...reading(3, 4, 'duplicate-b'), weatherDataChanged: true }];
    const result = resolvePredictor(snapshot, request);
    if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') throw new Error('Expected partial history');
    expect(result.resolved.quality.omissions).toMatchObject([
      { resourceGuid: predictor.guid, issue: 'Invalid saved month', readings: [expect.stringMatching(/invalid-a: 20.*2024-13.*Saved weather warning/), expect.stringMatching(/invalid-b: 30.*2024-14.*Saved weather data changed/)] },
      { issue: 'Nonfinite saved amount', readings: [expect.stringMatching(/nonfinite: Infinity.*2024-02.*Manual weather override/)] },
      { issue: 'Duplicate month', readings: [expect.stringMatching(/duplicate-a: 3.*Manual weather override/), expect.stringMatching(/duplicate-b: 4.*Saved weather data changed/)] }
    ]);
    expect(Object.values(result.resolved.data.rows[1].values)[0]).toMatchObject({ state: 'excluded', reason: expect.stringContaining('Manual weather override') });
    expect(Object.values(result.resolved.data.rows[2].values)[0]).toMatchObject({ state: 'excluded', reason: expect.stringContaining('duplicate-b: 4') });
    snapshot.predictorData.shift();
    const empty = resolvePredictor(snapshot, { ...request, period: { kind: 'rolling', unit: 'month', count: 12, basis: 'calendar', anchor: 'latest-data', includeIncomplete: false } });
    expect(empty).toMatchObject({ state: 'empty', reasons: expect.arrayContaining([expect.stringContaining('invalid-b: 30'), expect.stringContaining('Manual weather override'), expect.stringContaining('duplicate-b: 4')]) });
  });
  it('keeps invalid-date provenance without inferring retirement timing or an unknown weather measure', () => {
    const { snapshot, predictor, request, reading } = setup();
    snapshot.predictors = [{ ...predictor, predictorType: 'Weather', weatherDataType: undefined, unit: '', weatherStationName: 'Station', weatherStationId: 'station-id',
      noLongerInUse: true, noLongerInUseYear: 2023, noLongerInUseMonth: 12, weatherDataWarning: true }];
    snapshot.predictorData = [{ ...reading(13, 10), weatherOverride: true }];
    const result = resolvePredictor(snapshot, request);
    if (result.state !== 'empty') throw new Error('Expected invalid history');
    const reasons = result.reasons!.join(' ');
    expect(reasons).toContain('Weather measure not set'); expect(reasons).toContain('Unit not specified');
    expect(reasons).toContain('Station (station-id)'); expect(reasons).toContain('Saved weather warning'); expect(reasons).toContain('Manual weather override');
    expect(reasons).not.toContain('Saved reading after retirement');
  });
  it('aligns separate histories and empty siblings on one window, with a shared zero-eligible latest anchor', () => {
    const { snapshot, predictor, definition, request, reading, source } = setup();
    const weather = { ...predictor, guid: 'temperature', name: 'Temperature', predictorType: 'Weather' as const, weatherDataType: 'dryBulbTemp' as const, unit: '°F' };
    snapshot.predictors = [predictor, weather, { ...predictor, guid: 'empty', name: 'Empty', unit: 'hours' }];
    snapshot.predictorData = [reading(1, 0), reading(3, 40),
      { ...reading(3, 60, 'temp-3'), predictorId: weather.guid }, { ...reading(4, 0, 'temp-4'), predictorId: weather.guid },
      { ...reading(5, 2, 'duplicate-a'), predictorId: weather.guid }, { ...reading(5, 3, 'duplicate-b'), predictorId: weather.guid }];
    const selected = { ...source, selection: { kind: 'fixed' as const, resource: 'predictor' as const, guids: [predictor.guid, weather.guid, 'empty'] } };
    const latestDataDate = latestPredictorDate(snapshot, request.identity.scope, selected);
    expect(latestDataDate).toBe('2024-04-30');
    const requested = { ...request, source: selected, dateContext: { ...request.dateContext, latestDataDate } };
    const result = resolvePredictor(snapshot, requested);
    if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') throw new Error('Expected separate histories');
    expect(result.resolved.series.map(series => series.unit)).toEqual(['widgets', '°F', 'hours']);
    expect(result.resolved.data.rows).toHaveLength(5);
    expect(Object.values(result.resolved.data.rows[0].values)).toMatchObject([{ state: 'observed', value: 0 }, { state: 'alignment-padding' }, { state: 'alignment-padding' }]);
    expect(Object.values(result.resolved.data.rows[2].values)).toMatchObject([{ state: 'observed', value: 40 }, { state: 'observed', value: 60 }, { state: 'alignment-padding' }]);
    expect(Object.values(result.resolved.data.rows[4].values)[1]).toMatchObject({ state: 'excluded', reason: expect.stringMatching(/duplicate-a: 2.*duplicate-b: 3/) });
    expect(checkVisualizationCompatibility({ ...definition, sources: [selected] }, [{ request: requested, capabilities: predictorCapabilities(),
      chartSupport: predictorChartSupport(selected, request.chart), resolution: result }])).toMatchObject({ state: 'compatible' });
    const rolling = resolvePredictor(snapshot, { ...requested, period: { kind: 'rolling', count: 2, unit: 'month', basis: 'calendar', anchor: 'latest-data', includeIncomplete: false } });
    if (rolling.state !== 'ready' || rolling.resolved.data.kind !== 'time-series') throw new Error('Expected shared rolling dates');
    expect(rolling.resolved.data.rows.map(row => row.periodKey)).toEqual(['2024-03', '2024-04']);
    snapshot.predictors = [predictor];
    expect(resolvePredictor(snapshot, requested)).toMatchObject({ state: 'missing-source', references: [{ id: 'temperature', kind: 'predictor' }, { id: 'empty', kind: 'predictor' }] });
  });
  it('bounds the calculation-free catalog by owned facilities and supported types, including legacy, retired and empty predictors', () => {
    const { snapshot, predictor, request } = setup();
    snapshot.predictors = [predictor, { ...predictor, guid: 'weather', predictorType: 'Weather', noLongerInUse: true },
      { ...predictor, guid: 'legacy', predictorType: undefined }, { ...predictor, guid: 'foreign', accountId: 'other' },
      { ...predictor, guid: 'outside', facilityId: 'other' }, { ...predictor, guid: 'math', predictorType: 'Math' },
      { ...predictor, guid: 'conversion', predictorType: 'Conversion' }];
    expect(predictorCatalog(snapshot, request.identity.scope).map(p => p.guid).sort()).toEqual(['legacy', 'predictor-a', 'weather']);
  });
  it('preserves zero and gaps, proves ownership, and produces compatible runtime evidence', () => {
    const { snapshot, definition, request, reading, source } = setup();
    snapshot.predictorData = [reading(1, 0), reading(3, 40), { ...reading(2, 999), accountId: 'other' }, { ...reading(2, 999), facilityId: 'other' }];
    const before = structuredClone(snapshot), resolution = resolvePredictor(snapshot, request);
    expect(snapshot).toEqual(before); expect(resolution.state).toBe('ready');
    if (resolution.state !== 'ready' || resolution.resolved.data.kind !== 'time-series') throw new Error('Expected monthly data');
    expect(resolution.resolved.data.rows.map(row => Object.values(row.values)[0])).toMatchObject([
      { state: 'observed', value: 0 }, { state: 'missing', value: null }, { state: 'observed', value: 40 }
    ]);
    expect(checkVisualizationCompatibility(definition, [{ request, capabilities: predictorCapabilities(), chartSupport: predictorChartSupport(source, request.chart), resolution }]))
      .toMatchObject({ state: 'compatible' });
  });
  it('retains duplicate evidence, excludes nonfinite and invalid rows, and skips them for latest-data anchoring', () => {
    const { snapshot, request, reading, source } = setup();
    snapshot.predictorData = [reading(1, 0), reading(2, 3, 'duplicate-a'), reading(2, 4, 'duplicate-b'), reading(3, NaN), reading(13, 7)];
    expect(latestPredictorDate(snapshot, request.identity.scope, source)).toBe('2024-01-31');
    const resolution = resolvePredictor(snapshot, request);
    if (resolution.state !== 'ready' || resolution.resolved.data.kind !== 'time-series') throw new Error('Expected partial data');
    const duplicate = Object.values(resolution.resolved.data.rows[1].values)[0];
    expect(duplicate).toMatchObject({ state: 'excluded', value: null, reason: expect.stringContaining('duplicate-a: 3; duplicate-b: 4') });
    expect(resolution.resolved.quality.warnings).toEqual([]);
    expect(resolution.resolved.quality.omissions).toMatchObject([
      { issue: 'Invalid saved month', readings: [expect.stringContaining('reading-13: 7 (2024-13)')] },
      { issue: 'Duplicate month', readings: ['duplicate-a: 3 (2024-02)', 'duplicate-b: 4 (2024-02)'] },
      { issue: 'Nonfinite saved amount', readings: [expect.stringContaining('reading-3: NaN')] }
    ]);
  });
  it('plots saved weather overrides and negatives after retirement with provenance and saved context', () => {
    const { snapshot, predictor, request, reading } = setup();
    snapshot.predictors = [{ ...predictor, predictorType: 'Weather', weatherDataType: 'dryBulbTemp', unit: '', weatherStationName: 'Saved station',
      noLongerInUse: true, noLongerInUseYear: 2023, noLongerInUseMonth: 12 }];
    snapshot.predictorData = [{ ...reading(1, -4), weatherDataWarning: true, weatherDataChanged: true, weatherOverride: true }];
    const resolution = resolvePredictor(snapshot, request);
    if (resolution.state !== 'ready' || resolution.resolved.data.kind !== 'time-series') throw new Error('Expected saved weather');
    expect(resolution.resolved.series[0].unit).toBe('°F');
    expect(Object.values(resolution.resolved.data.rows[0].values)[0]).toMatchObject({ state: 'observed', value: -4, provenance: 'weather',
      notes: expect.arrayContaining(['Negative saved amount', 'Saved weather warning', 'Saved weather data changed', 'Manual weather override', 'Saved reading after retirement', expect.stringContaining('Saved station')]) });
    expect(resolution.resolved.quality.warnings).toEqual([]);
  });
  it.each([
    { period: { kind: 'fixed' as const, basis: 'calendar' as const, start: '2024-01-15', end: '2024-03-10' }, start: '2024-02-01', end: '2024-02-29', rows: 1 },
    { period: { kind: 'rolling' as const, basis: 'calendar' as const, count: 12, unit: 'month' as const, anchor: 'calendar' as const, includeIncomplete: false }, start: '2025-03-01', end: '2026-02-28', rows: 12 },
    { period: { kind: 'rolling' as const, basis: 'calendar' as const, count: 2, unit: 'year' as const, anchor: 'calendar' as const, includeIncomplete: false }, start: '2024-03-01', end: '2026-02-28', rows: 24 },
    { period: { kind: 'rolling' as const, basis: 'calendar' as const, count: 1, unit: 'month' as const, anchor: 'latest-data' as const, includeIncomplete: false }, start: '2024-03-01', end: '2024-03-31', rows: 1 }
  ])('resolves whole monthly boundaries for $period', ({ period, start, end, rows }) => {
    const { snapshot, request, reading } = setup();
    snapshot.predictorData = [reading(2, 3), reading(3, 8), { ...reading(2, 5, 'latest'), year: 2026 }];
    const resolution = resolvePredictor(snapshot, { ...request, period, dateContext: { calendarDate: '2026-03-15', latestDataDate: '2024-03-31' } });
    if (resolution.state !== 'ready' || resolution.resolved.data.kind !== 'time-series') throw new Error('Expected ranged data');
    expect(resolution.resolved.data.rows).toHaveLength(rows);
    expect(resolution.resolved.periods[0]).toMatchObject({ start, end });
  });
  it('keeps empty/invalid histories explainable and missing/placeholder bindings unavailable', () => {
    const { snapshot, predictor, request, reading } = setup();
    expect(resolvePredictor(snapshot, request).state).toBe('empty');
    snapshot.predictorData = [reading(1, NaN)];
    expect(resolvePredictor(snapshot, request)).toMatchObject({ state: 'empty', reasons: [expect.stringContaining('Nonfinite')] });
    snapshot.predictors = [{ ...predictor, predictorType: 'Math' }];
    expect(resolvePredictor(snapshot, request).state).toBe('unsupported');
    snapshot.predictors = [];
    expect(resolvePredictor(snapshot, request).state).toBe('missing-source');
  });
  it('keeps duplicate and invalid evidence in empty latest-data previews without inventing an anchor', () => {
    const { snapshot, request, reading } = setup();
    snapshot.predictorData = [reading(2, 1, 'a'), reading(2, 2, 'b'), reading(3, NaN)];
    const result = resolvePredictor(snapshot, { ...request, period: { kind: 'rolling', count: 12, unit: 'month', anchor: 'latest-data', basis: 'calendar', includeIncomplete: false } });
    expect(result).toMatchObject({ state: 'empty', reasons: [expect.stringContaining('a: 1 (2024-02); b: 2 (2024-02)'), expect.stringContaining('Nonfinite')] });
  });
  it('rejects rules, aggregation, conversions, comparisons, fiscal windows and nonmonthly charts', () => {
    const { snapshot, request, source } = setup();
    for (const change of [{ source: { ...source, aggregation: 'sum' as const } }, { source: { ...source, selection: { kind: 'rule' as const, resource: 'predictor' as const, filter: { search: 'unimplemented' } } } },
      { source: { ...source, settings: { unit: { kind: 'pinned' as const, value: 'kg' } } } }, { comparison: { kind: 'previous-period' as const } },
      { period: { kind: 'fiscal-year' as const, year: 2024 } }, { chart: { kind: 'time-series' as const, defaultTraceType: 'line' as const, interval: 'yearly' as const, stack: 'none' as const } }]) {
      expect(resolvePredictor(snapshot, { ...request, ...change }).state).toBe('unsupported');
    }
  });
});
