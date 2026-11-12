import { createVisualizationSetupDefinition, createVisualizationDefinition, VisualizationChart, VisualizationComparison, VisualizationDefinition, VisualizationPeriod, VisualizationSourceKind } from './visualization-definition';
import { decodeVisualizationDefinition } from './visualization-validation';
import { analysisVisualizationFixture, energyUseVisualizationFixture, utilityVisualizationFixture } from './testing/visualization-fixtures';

describe('visualization saved intent', () => {
  it('reads v1 into equivalent v2 intent without changing the supplied historical payload', () => {
    const current = utilityVisualizationFixture();
    const historical = { ...current, version: 1 };
    const before = structuredClone(historical);
    const decoded = decodeVisualizationDefinition(historical);
    expect(decoded.state).toBe('valid');
    expect('definition' in decoded && decoded.definition).toEqual(current);
    expect(historical).toEqual(before);
    expect('definition' in decoded && decodeVisualizationDefinition(decoded.definition)).toEqual(decoded);
  });

  it('allows v2 visibility and dormant presentation overrides, but never accepts them as v1 fields', () => {
    const base = utilityVisualizationFixture();
    const { resourceGuid, ...wildcard } = base.series[0];
    const definition = { ...base, series: [{ ...wildcard, visible: true, overrides: [
      { resourceGuid: 'meter-a', visible: false, color: '#123456' },
      { resourceGuid: 'retired-meter', label: 'Retained name', axis: 'right' }
    ] }] };
    expect(decodeVisualizationDefinition(definition).state).toBe('valid');
    expect(decodeVisualizationDefinition({ ...definition, version: 1 }).state).toBe('invalid');
    expect(decodeVisualizationDefinition({ ...definition, series: [{ ...definition.series[0], overrides: [
      { resourceGuid: 'meter-a' }, { resourceGuid: 'meter-a', visible: false }
    ] }] }).state).toBe('invalid');
    expect(decodeVisualizationDefinition({ ...definition, series: [{ ...definition.series[0], resourceGuid: 'meter-a' }] }).state).toBe('invalid');
  });

  it.each([
    ['portfolio utility', utilityVisualizationFixture()],
    ['single facility utility', utilityVisualizationFixture({ kind: 'facility', facilityGuid: 'facility-a' })],
    ['analysis result', analysisVisualizationFixture()], ['pinned saved model', analysisVisualizationFixture(true)],
    ['equipment treemap', energyUseVisualizationFixture()], ['equipment Sankey', energyUseVisualizationFixture(true)]
  ])('round-trips %s without changing source or presentation meaning', (_, original) => {
    const before = JSON.stringify(original);
    const result = decodeVisualizationDefinition(JSON.parse(before));
    expect(result.state).toBe('valid');
    expect('definition' in result && result.definition).toEqual(original);
    expect(JSON.stringify(original)).toBe(before);
  });

  it.each<VisualizationSourceKind>(['utility', 'predictor', 'weather', 'energy-use', 'analysis-result', 'analysis-model'])('creates recoverable incomplete %s intent', kind => {
    const value = createVisualizationDefinition('New chart', 'account-a', { kind: 'portfolio' }, kind);
    const result = decodeVisualizationDefinition(value);
    expect(result.state).toBe('setup-required');
    expect('definition' in result && result.definition.sources[0].kind).toBe(kind);
    expect(value.period.kind).toBe(kind === 'energy-use' ? 'latest-saved-year' : 'all-history');
  });

  it('creates independent setup sources and retains chart intent without inventing series', () => {
    const chart = { kind: 'scatter' as const, showFit: false };
    const value = createVisualizationSetupDefinition({ name: 'Usage versus production', accountGuid: 'account-a',
      scope: { kind: 'portfolio' }, chart, sourceKinds: ['utility', 'predictor', 'weather'] });
    expect(value.sources.map(source => source.kind)).toEqual(['utility', 'predictor', 'weather']);
    expect(value.sources.map(source => source.id)).toEqual(['source-1', 'source-2', 'source-3']);
    expect(value.series).toEqual([]);
    expect(value.chart).toEqual(chart);
    expect(value.chart).not.toBe(chart);
    expect(value.sources[0].settings).not.toBe(value.sources[1].settings);
    expect(decodeVisualizationDefinition(JSON.parse(JSON.stringify(value))).state).toBe('setup-required');
    expect(value.period).toEqual({ kind: 'all-history' });
    expect(value.version).toBe(2);
  });

  it('decodes category presentation identities and rejects ambiguous or absent selectors', () => {
    const base = utilityVisualizationFixture();
    const { resourceGuid, ...wildcard } = base.series[0];
    const withOverrides = (overrides: unknown[]) => ({ ...base, series: [{ ...wildcard, overrides }] });
    expect(decodeVisualizationDefinition(withOverrides([{ seriesId: 'utility:source:Electricity', visible: false, order: 0 }])).state).toBe('valid');
    for (const order of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, '1'])
      expect(decodeVisualizationDefinition(withOverrides([{ seriesId: 'category', order }])).state).toBe('invalid');
    expect(decodeVisualizationDefinition(withOverrides([{ seriesId: 'utility:source:Electricity', resourceGuid: 'meter-a' }])).state).toBe('invalid');
    expect(decodeVisualizationDefinition(withOverrides([{ visible: false }])).state).toBe('invalid');
    expect(decodeVisualizationDefinition(withOverrides([{ seriesId: '' }])).state).toBe('invalid');
    expect(decodeVisualizationDefinition(withOverrides([{ seriesId: 'category' }, { seriesId: 'category' }])).state).toBe('invalid');
    // Equal strings in different identity namespaces are not ambiguous.
    expect(decodeVisualizationDefinition(withOverrides([{ seriesId: 'category' }, { resourceGuid: 'category' }])).state).toBe('valid');
  });

  it('uses the latest saved fiscal year only for Energy Use alone', () => {
    const create = (sourceKinds: readonly VisualizationSourceKind[]) => createVisualizationSetupDefinition({
      name: 'New chart', accountGuid: 'account-a', scope: { kind: 'portfolio' },
      chart: { kind: 'treemap', hierarchy: [], values: 'absolute' }, sourceKinds });
    expect(create(['energy-use']).period).toEqual({ kind: 'latest-saved-year', basis: 'fiscal' });
    expect(create(['energy-use', 'utility']).period).toEqual({ kind: 'all-history' });
    expect(create(['utility', 'energy-use']).period).toEqual({ kind: 'all-history' });
    expect(() => create([])).toThrow('unique source families');
    expect(() => create(['utility', 'utility'])).toThrow('unique source families');
  });

  it('keeps unassigned Scatter axes incomplete while accepting existing assigned axes', () => {
    const base = utilityVisualizationFixture();
    for (const chart of [
      { kind: 'scatter', showFit: false },
      { kind: 'scatter', xSeriesId: 'energy', showFit: false },
      { kind: 'scatter', ySeriesId: 'energy', showFit: false }
    ]) {
      const result = decodeVisualizationDefinition({ ...base, chart });
      expect(result.state).toBe('setup-required');
      expect('definition' in result && result.definition.chart).toEqual(chart);
    }
    expect(decodeVisualizationDefinition({ ...base, chart: {
      kind: 'scatter', xSeriesId: 'energy', ySeriesId: 'energy', showFit: false
    } }).state).toBe('valid');
  });

  it.each(['', ' ', null, 3, undefined])('rejects malformed supplied Scatter axis %s', xSeriesId => {
    expect(decodeVisualizationDefinition({ ...utilityVisualizationFixture(), chart: {
      kind: 'scatter', xSeriesId, showFit: false
    } }).state).toBe('invalid');
  });

  it.each<VisualizationPeriod>([
    { kind: 'all-history' }, { kind: 'fixed', start: '2024-02-29', end: '2025-02-28', basis: 'calendar' },
    { kind: 'rolling', count: 12, unit: 'month', anchor: 'latest-data', basis: 'calendar', includeIncomplete: true },
    { kind: 'rolling', count: 3, unit: 'year', anchor: 'calendar', basis: 'fiscal', includeIncomplete: false },
    { kind: 'latest-saved-year', basis: 'fiscal' }, { kind: 'fiscal-year', year: 2025 }
  ])('retains explicit period rule $kind', period => {
    const original = { ...utilityVisualizationFixture(), period };
    const result = decodeVisualizationDefinition(JSON.parse(JSON.stringify(original)));
    expect(result.state).toBe('valid');
    expect('definition' in result && result.definition.period).toEqual(period);
  });

  it.each<VisualizationComparison>([
    { kind: 'none' }, { kind: 'previous-period' }, { kind: 'previous-year', basis: 'calendar' },
    { kind: 'previous-year', basis: 'fiscal' }, { kind: 'custom', start: '2022-01-01', end: '2022-12-31' }
  ])('retains comparison $kind', comparison => {
    const result = decodeVisualizationDefinition({ ...utilityVisualizationFixture(), comparison });
    expect(result.state).toBe('valid');
    expect('definition' in result && result.definition.comparison).toEqual(comparison);
  });

  it.each<VisualizationChart>([
    { kind: 'time-series', type: 'combination', interval: 'monthly', stack: 'absolute', seriesTypes: [{ seriesId: 'energy', type: 'bar' }] },
    { kind: 'scatter', xSeriesId: 'energy', ySeriesId: 'energy', showFit: false },
    { kind: 'correlation', statistic: 'r-squared', scale: 'z-score' },
    { kind: 'heatmap', dimension: 'series-period', scale: 'diverging' },
    { kind: 'breakdown', type: 'donut', values: 'percent' },
    { kind: 'treemap', hierarchy: ['facility', 'equipment'], values: 'percent' },
    { kind: 'sankey', flow: 'energy-balance' }
  ])('decodes typed $kind settings independently of runtime compatibility', chart => {
    const result = decodeVisualizationDefinition({ ...utilityVisualizationFixture(), chart });
    expect(result.state).toBe('valid');
    expect('definition' in result && result.definition.chart).toEqual(chart);
  });

  it('preserves rule anchors and owner bindings rather than resolving ambient selection', () => {
    const base = utilityVisualizationFixture();
    const value: VisualizationDefinition = { ...base, sources: [{ ...base.sources[0], kind: 'utility', measure: 'energy', aggregation: 'sum',
      dataMode: 'calendarized', groupBy: 'group', selection: { kind: 'rule', resource: 'meter', filter: {
        facilityGuids: ['facility-a'], groupGuids: ['group-a'], utilitySources: ['Electricity'], search: 'main', includeRetired: false
      } }, settings: { unit: { kind: 'owner' }, energyTreatment: { kind: 'owner' } } }] };
    const result = decodeVisualizationDefinition(JSON.parse(JSON.stringify(value)));
    expect(result.state).toBe('valid');
    expect('definition' in result && result.definition).toEqual(value);
  });

  it('accepts a complete predictor and weather source without retrieving or inventing values', () => {
    const base = utilityVisualizationFixture();
    for (const kind of ['predictor', 'weather'] as const) {
      const value: VisualizationDefinition = { ...base,
        sources: [{ id: 'utility', kind, measure: 'value', aggregation: 'none', selection: { kind: 'fixed', resource: 'predictor', guids: ['predictor-a'] } }],
        series: [{ id: 'value', sourceId: 'utility', metric: 'value', axis: 'left' }] };
      expect(decodeVisualizationDefinition(value).state).toBe('valid');
    }
  });

  it('retains malformed and incomplete intent as different outcomes', () => {
    const value = utilityVisualizationFixture();
    expect(decodeVisualizationDefinition({ ...value, name: '' }).state).toBe('invalid');
    const incomplete = { ...value, sources: [], series: [] };
    const result = decodeVisualizationDefinition(incomplete);
    expect(result.state).toBe('setup-required');
    expect('definition' in result && result.definition).toEqual(incomplete);
    expect(decodeVisualizationDefinition({ ...value, series: [{ ...value.series[0], sourceId: 'unconfigured-source' }] }).state).toBe('setup-required');
  });

  it('does not substitute a selected model for a missing pin', () => {
    const value = analysisVisualizationFixture(true);
    const model = value.sources[0];
    if (model.kind !== 'analysis-model') throw new Error('Expected model fixture');
    const { modelId, ...withoutPin } = model;
    const result = decodeVisualizationDefinition({ ...value, sources: [withoutPin] });
    expect(result.state).toBe('setup-required');
    expect('definition' in result && result.definition.sources[0]).toEqual(withoutPin);
  });

  it('requires charge identity, a compatible resource kind, and declared series', () => {
    const value = utilityVisualizationFixture();
    const source = value.sources[0];
    if (source.kind !== 'utility') throw new Error('Expected utility fixture');
    expect(decodeVisualizationDefinition({ ...value, sources: [{ ...source, measure: 'charge' }] }).state).toBe('setup-required');
    expect(decodeVisualizationDefinition({ ...value, sources: [{ ...source, selection: { kind: 'fixed', resource: 'equipment', guids: ['equipment-a'] } }] }).state).toBe('setup-required');
    expect(decodeVisualizationDefinition({ ...value, chart: { kind: 'scatter', xSeriesId: 'absent', ySeriesId: 'energy', showFit: true } }).state).toBe('setup-required');
  });

  it('decodes fully specified charges without dropping raw billing intent', () => {
    const base = utilityVisualizationFixture();
    const source = base.sources[0];
    if (source.kind !== 'utility') throw new Error('Expected utility fixture');
    const value = { ...base, series: [{ ...base.series[0], metric: 'charge' }], sources: [{ ...source, measure: 'charge', dataMode: 'billing-period',
      charge: { meterGuid: 'meter-a', chargeGuid: 'charge-a', measure: 'usage' } }] };
    const result = decodeVisualizationDefinition(value);
    expect(result.state).toBe('valid');
    expect('definition' in result && result.definition.sources).toEqual(value.sources);
  });

  it.each([
    ['unknown field', { options: {} }], ['temporary zoom', { zoom: { start: 0, end: 50 } }],
    ['computed rows', { rows: [] }], ['missing name', { name: undefined }], ['blank owner', { accountGuid: ' ' }],
    ['invalid calendar day', { period: { kind: 'fixed', start: '2023-02-29', end: '2024-01-01', basis: 'calendar' } }],
    ['reversed range', { comparison: { kind: 'custom', start: '2024-12-01', end: '2024-01-01' } }],
    ['fractional window', { period: { kind: 'rolling', count: 1.5, unit: 'month', anchor: 'latest-data', basis: 'calendar', includeIncomplete: true } }],
    ['infinite window', { period: { kind: 'rolling', count: Infinity, unit: 'month', anchor: 'latest-data', basis: 'calendar', includeIncomplete: true } }],
    ['numeric resource key', { scope: { kind: 'facility', facilityGuid: 3 } }]
  ])('rejects %s without coercion', (_, replacement) => {
    expect(decodeVisualizationDefinition({ ...utilityVisualizationFixture(), ...replacement }).state).toBe('invalid');
  });

  it('rejects duplicate identities rather than allowing ambiguous references', () => {
    const value = utilityVisualizationFixture();
    expect(decodeVisualizationDefinition({ ...value, sources: [...value.sources, ...value.sources] }).state).toBe('invalid');
    expect(decodeVisualizationDefinition({ ...value, series: [...value.series, ...value.series] }).state).toBe('invalid');
    const source = value.sources[0];
    if (source.kind !== 'utility') throw new Error('Expected utility fixture');
    expect(decodeVisualizationDefinition({ ...value, sources: [{ ...source, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a', 'meter-a'] } }] }).state).toBe('invalid');
  });

  it('distinguishes unsupported versions and providers without altering caller data', () => {
    const value = { ...utilityVisualizationFixture(), version: 3, futureSettings: { untouched: true } };
    const before = JSON.stringify(value);
    expect(decodeVisualizationDefinition(value).state).toBe('unsupported');
    expect(JSON.stringify(value)).toBe(before);
    expect(decodeVisualizationDefinition({ ...utilityVisualizationFixture(), sources: [{ id: 'future', kind: 'future-provider' }] }).state).toBe('unsupported');
  });

  it.each([new Date(), () => 1, NaN, BigInt(1), new Map(), Symbol('intent')])('rejects non-JSON value %s', unsupported => {
    expect(decodeVisualizationDefinition({ ...utilityVisualizationFixture(), extra: unsupported }).state).toBe('invalid');
  });

  it('rejects cycles, accessors, hidden fields, symbols and sparse arrays', () => {
    const cycle: Record<string, unknown> = { ...utilityVisualizationFixture() }; cycle['cycle'] = cycle;
    expect(decodeVisualizationDefinition(cycle).state).toBe('invalid');
    const getter = Object.defineProperty({ ...utilityVisualizationFixture() }, 'extra', { enumerable: true, get: () => { throw new Error('Must not run'); } });
    expect(decodeVisualizationDefinition(getter).state).toBe('invalid');
    expect(decodeVisualizationDefinition(Object.defineProperty({ ...utilityVisualizationFixture() }, 'hidden', { value: 1 })).state).toBe('invalid');
    expect(decodeVisualizationDefinition({ ...utilityVisualizationFixture(), [Symbol('extra')]: 1 }).state).toBe('invalid');
    expect(decodeVisualizationDefinition({ ...utilityVisualizationFixture(), sources: new Array(2) }).state).toBe('invalid');
  });

  it('rejects array prototypes that can change serialization through inherited executable behavior', () => {
    class RewritingSources extends Array<VisualizationDefinition['sources'][number]> {
      toJSON() { throw new Error('Inherited executable serialization must not run.'); }
    }
    const original = utilityVisualizationFixture();
    expect(decodeVisualizationDefinition({ ...original, sources: RewritingSources.from(original.sources) }).state).toBe('invalid');
  });

  it('rejects numeric array properties that JSON would discard', () => {
    const original = utilityVisualizationFixture();
    const sources = Object.assign([...original.sources], { '4294967295': { dropped: true } });
    expect(decodeVisualizationDefinition({ ...original, sources }).state).toBe('invalid');
  });

  it('rejects huge sparse arrays without walking every missing index', () => {
    expect(decodeVisualizationDefinition({ ...utilityVisualizationFixture(), sources: new Array(0xffffffff) }).state).toBe('invalid');
  });
});
