import { createVisualizationDefinition, VisualizationChart, VisualizationDefinition } from './visualization-definition';
import { checkVisualizationCompatibility } from './visualization-capabilities';
import { captureVisualizationDefinition, REQUIRED_CAPTURE_ASPECTS, resolveVisualizationEmbedding, VisualizationEmbeddingContext } from './visualization-integration';
import { isCurrentVisualizationResponse, VisualizationData, VisualizationSourceEvidence, VisualizationSourceResolution } from './visualization-source-provider';
import { analysisVisualizationFixture, energyUseVisualizationFixture, utilityVisualizationFixture } from './testing/visualization-fixtures';
import { FakeVisualizationSourceProvider, observed, visualizationEvidenceFixture } from './testing/visualization-provider-fixtures';

function ready(evidence: VisualizationSourceEvidence) {
  if (evidence.resolution.state !== 'ready') throw new Error('Expected ready fixture.');
  return evidence.resolution.resolved;
}
function replaceResolved(evidence: VisualizationSourceEvidence, overrides: Partial<ReturnType<typeof ready>>): VisualizationSourceEvidence {
  return { ...evidence, resolution: { state: 'ready', identity: evidence.request.identity, resolved: { ...ready(evidence), ...overrides } } };
}
function reasonCodes(definition: VisualizationDefinition, evidence: readonly VisualizationSourceEvidence[]) {
  const result = checkVisualizationCompatibility(definition, evidence);
  return result.state === 'unavailable' ? result.reasons.map(reason => reason.code) : [];
}
function reorderedKeys<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).reverse()) as T;
}
const faithful = { sourceIdentities: 'durable' as const, preserved: REQUIRED_CAPTURE_ASPECTS, omissions: [] };
const context: VisualizationEmbeddingContext = { reference: { visualizationGuid: 'visualization-a', accountGuid: 'account-a' },
  hostAccountGuid: 'account-a', hostScope: { kind: 'facility', facilityGuid: 'different-facility', facilityGuids: ['different-facility'] } };

describe('visualization source/runtime contracts', () => {
  it.each([
    ['portfolio utility', utilityVisualizationFixture()],
    ['single facility utility', utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] })],
    ['analysis results', analysisVisualizationFixture()], ['pinned model', analysisVisualizationFixture(true)],
    ['Energy Use treemap', energyUseVisualizationFixture()], ['Energy Use Sankey', energyUseVisualizationFixture(true)]
  ])('supports a declared %s without mutating its intent', async (_, definition) => {
    const before = JSON.stringify(definition);
    const evidence = visualizationEvidenceFixture(definition);
    const provider = new FakeVisualizationSourceProvider(evidence);
    const response = await provider.resolve(evidence.request, new AbortController().signal);
    expect(provider.describe()).toEqual(evidence.capabilities);
    expect(isCurrentVisualizationResponse(evidence.request.identity, response)).toBe(true);
    expect(checkVisualizationCompatibility(definition, [{ ...evidence, resolution: response }]).state).toBe('compatible');
    const resolved = ready(evidence);
    expect(resolved.provenance).toEqual([definition.sources[0].kind === 'energy-use' ? 'estimated'
      : definition.sources[0].kind === 'analysis' && definition.sources[0].mode === 'model' ? 'modeled' : 'measured']);
    const observation = resolved.data.kind === 'time-series' ? Object.values(resolved.data.rows[0].values)[0]
      : resolved.data.kind === 'hierarchy' ? resolved.data.nodes[0].observation
      : resolved.data.kind === 'flow' ? resolved.data.links[0].observation : undefined;
    if (observation?.state === 'observed') expect(resolved.provenance).toContain(observation.provenance);
    expect(JSON.stringify(definition)).toBe(before);
  });

  it.each(['Standard', 'Weather'] as const)('retains %s predictor provenance without a remote-data dependency', predictorType => {
    const initial = createVisualizationDefinition('Temperature', 'account-a', { kind: 'all' }, 'predictor');
    const definition: VisualizationDefinition = { ...initial, sources: [{ id: 'predictors', kind: 'predictor', measure: 'value', aggregation: 'none',
      selection: { kind: 'fixed', resource: 'predictor', guids: ['temperature-a'] } }],
      series: [{ id: 'temperature', sourceId: 'predictors', resourceGuid: 'temperature-a', metric: 'value', axis: 'left' }],
      chart: { kind: 'time-series', type: 'line', interval: 'monthly', stack: 'none' } };
    const evidence = visualizationEvidenceFixture(definition, 0, [{ guid: 'temperature-a', predictorType }]);
    expect(checkVisualizationCompatibility(definition, [evidence]).state).toBe('compatible');
    const provenance = predictorType === 'Weather' ? 'weather' : 'predictor';
    const resolved = ready(evidence); expect(resolved.provenance).toEqual([provenance]);
    if (resolved.data.kind !== 'time-series') throw new Error('Expected time-series');
    expect(Object.values(resolved.data.rows[0].values)[0]).toMatchObject({ provenance });
  });

  it('retains standard and weather observations within one predictor source', () => {
    const definition: VisualizationDefinition = {
      ...createVisualizationDefinition('Predictors', 'account-a', { kind: 'all' }, 'predictor'),
      sources: [{ id: 'predictors', kind: 'predictor', measure: 'value', aggregation: 'none',
        selection: { kind: 'fixed', resource: 'predictor', guids: ['standard-a', 'weather-a'] } }],
      series: ['standard-a', 'weather-a'].map(resourceGuid => ({ id: resourceGuid, sourceId: 'predictors', resourceGuid, metric: 'value', axis: 'left' })),
      chart: { kind: 'time-series', type: 'line', interval: 'monthly', stack: 'none' }
    };
    const evidence = visualizationEvidenceFixture(definition, 0, [
      { guid: 'standard-a', predictorType: 'Standard' }, { guid: 'weather-a', predictorType: 'Weather' }
    ]);
    expect(checkVisualizationCompatibility(definition, [evidence]).state).toBe('compatible');
    const resolved = ready(evidence);
    expect(resolved.provenance).toEqual(['predictor', 'weather']);
    if (resolved.data.kind !== 'time-series') throw new Error('Expected time-series');
    expect(resolved.data.rows[0].values['standard-a']).toMatchObject({ provenance: 'predictor' });
    expect(resolved.data.rows[0].values['weather-a']).toMatchObject({ provenance: 'weather' });
  });

  it('preserves carried-forward equipment values alongside estimates', () => {
    const definition = energyUseVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    const data = ready(evidence).data; if (data.kind !== 'hierarchy') throw new Error('Expected hierarchy');
    const changed = replaceResolved(evidence, { provenance: ['estimated', 'carried-forward'], data: { ...data,
      nodes: [...data.nodes, { id: 'equipment-b', label: 'Carried-forward equipment', observation: { state: 'observed', value: 25, partial: true, provenance: 'carried-forward' } }] } });
    expect(checkVisualizationCompatibility(definition, [changed]).state).toBe('compatible');
    expect(ready(changed).data).toMatchObject({ nodes: [{ observation: { provenance: 'estimated' } }, { observation: { provenance: 'carried-forward', partial: true } }] });
  });

  it('keeps true zero, gaps, alignment padding, exclusions and partial observations distinct', () => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    const samples = [observed(0), { state: 'missing' as const, value: null, reason: 'No reading' },
      { state: 'alignment-padding' as const, value: null, reason: 'Outside comparison' },
      { state: 'excluded' as const, value: null, reason: 'User exclusion' }, { ...observed(12), partial: true }];
    const data = { kind: 'time-series' as const, rows: samples.map((sample, index) => ({
      periodKey: `2025-0${index + 1}`, start: `2025-0${index + 1}-01`, end: `2025-0${index + 1}-28`, values: { energy: sample }
    })) };
    const changed = replaceResolved(evidence, { data, quality: { partial: true, warnings: ['Partial month'] } });
    expect(checkVisualizationCompatibility(definition, [changed]).state).toBe('compatible');
    expect(ready(changed).data).toEqual(data);
  });

  it.each<{ chart: VisualizationChart; data: VisualizationData }>([
    { chart: { kind: 'scatter', xSeriesId: 'energy', ySeriesId: 'energy', showFit: false },
      data: { kind: 'pairs', pairs: [{ key: 'bill-occurrence-a', x: observed(0), y: observed(4) }], excludedPairCount: 1 } },
    { chart: { kind: 'heatmap', dimension: 'series-period', scale: 'linear' },
      data: { kind: 'matrix', cells: [{ row: 'energy', column: '2025-01', observation: observed(0) }] } },
    { chart: { kind: 'breakdown', type: 'bar', values: 'absolute' },
      data: { kind: 'breakdown', items: [{ id: 'meter-a', label: 'Electricity', observation: observed(0) }] } }
  ])('accepts the explicitly supported $data.kind shape without dropping its observations', ({ chart, data }) => {
    const definition = { ...utilityVisualizationFixture(), chart }, evidence = visualizationEvidenceFixture(definition);
    const changed = replaceResolved(evidence, { data });
    expect(checkVisualizationCompatibility(definition, [changed]).state).toBe('compatible');
    expect(ready(changed).data).toEqual(data);
    expect(reasonCodes(definition, [{ ...changed, capabilities: { ...changed.capabilities, shapes: [] } }])).toContain('capability');
  });

  it('rejects excluded facility output and different inclusion boundaries across requests', () => {
    const definition = { ...utilityVisualizationFixture(), facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-a', 'facility-b'] } };
    const evidence = visualizationEvidenceFixture(definition);
    const excluded = replaceResolved(evidence, { references: [...ready(evidence).references,
      { kind: 'meter', id: 'excluded', accountGuid: 'account-a', facilityGuid: 'facility-c' }] });
    expect(reasonCodes(definition, [excluded])).toContain('ownership');
    const identity = { ...evidence.request.identity, scope: { kind: 'portfolio' as const, facilityGuids: ['facility-a', 'facility-c'] } };
    expect(reasonCodes(definition, [{ ...evidence, request: { ...evidence.request, identity }, resolution: { ...evidence.resolution, identity } }])).toContain('stale');
  });
  it('does not present an account-wide precomputed result as a filtered facility subset', () => {
    const definition = { ...analysisVisualizationFixture(), facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-a', 'facility-b'] } };
    const evidence = visualizationEvidenceFixture(definition);
    const accountReferences = ready(evidence).references.map(reference => {
      if (reference.kind !== 'analysis') return reference;
      const { facilityGuid: _facility, ...accountReference } = reference;
      return accountReference;
    });
    expect(reasonCodes(definition, [replaceResolved(evidence, { references: accountReferences })])).toContain('ownership');
  });

  it.each(['loading', 'waiting', 'empty', 'missing-source', 'invalid-analysis', 'error', 'unsupported'] as const)
  ('blocks %s instead of publishing a ready chart', state => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    const response = { state, identity: evidence.request.identity, message: 'Unavailable', periods: [], references: [] } as VisualizationSourceResolution;
    expect(checkVisualizationCompatibility(definition, [{ ...evidence, resolution: response }]).state).toBe('unavailable');
  });

  it.each([
    { accountGuid: 'another-account' }, { workspaceRevision: 2 }, { definitionGuid: 'another-chart' }, { definitionRevision: 2 },
    { requestId: 'new-request' }, { sourceId: 'other-source' }, { scope: { kind: 'facility' as const, facilityGuid: 'facility-a', facilityGuids: ['facility-a'] } }
  ])('rejects a response from a different request context: %j', change => {
    const evidence = visualizationEvidenceFixture(utilityVisualizationFixture());
    expect(isCurrentVisualizationResponse({ ...evidence.request.identity, ...change }, evidence.resolution)).toBe(false);
  });

  it('does not publish results after cancellation, even if the provider completed', async () => {
    const evidence = visualizationEvidenceFixture(utilityVisualizationFixture()); const controller = new AbortController();
    const response = await new FakeVisualizationSourceProvider(evidence).resolve(evidence.request, controller.signal);
    controller.abort();
    expect(isCurrentVisualizationResponse(evidence.request.identity, response, controller.signal)).toBe(false);
    expect((await new FakeVisualizationSourceProvider(evidence).resolve(evidence.request, controller.signal)).state).toBe('waiting');
  });

  it.each(['period', 'comparison', 'source', 'series', 'chart'] as const)('rejects stale %s intent despite matching revision labels', key => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    const request = { ...evidence.request, [key]: key === 'period' ? { kind: 'fiscal-year', year: 2020 }
      : key === 'comparison' ? { kind: 'previous-period' } : key === 'series' ? [] : key === 'chart' ? { ...evidence.request.chart, type: 'bar' } : { ...evidence.request.source, measure: 'cost' } };
    expect(reasonCodes(definition, [{ ...evidence, request } as VisualizationSourceEvidence])).toContain('stale');
  });

  it('requires exact chart settings support, not just a matching chart kind', () => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    expect(reasonCodes(definition, [{ ...evidence, chartSupport: { state: 'unsupported', chart: definition.chart!, reasons: ['This analysis band cannot be rendered as bars.'] } }])).toContain('capability');
  });

  it('compares equivalent request and chart-support objects independently of property insertion order', () => {
    const definition = utilityVisualizationFixture(), evidence = visualizationEvidenceFixture(definition);
    const source = evidence.request.source;
    if (source.kind !== 'utility' || !source.selection) throw new Error('Expected utility selection');
    const equivalent = { ...evidence, request: { ...evidence.request,
      source: reorderedKeys({ ...source, selection: reorderedKeys(source.selection), settings: source.settings ? reorderedKeys(source.settings) : undefined }),
      chart: reorderedKeys(evidence.request.chart), period: reorderedKeys(evidence.request.period),
      series: evidence.request.series.map(reorderedKeys), dateContext: reorderedKeys(evidence.request.dateContext)
    }, chartSupport: { ...evidence.chartSupport, chart: reorderedKeys(evidence.chartSupport.chart) } };
    expect(checkVisualizationCompatibility(definition, [equivalent]).state).toBe('compatible');
    expect(captureVisualizationDefinition(definition, [equivalent], faithful).state).toBe('supported');
    expect(resolveVisualizationEmbedding(definition, context, [equivalent]).state).toBe('configured');
  });

  it('preserves ordered series intent while ignoring object-key order', () => {
    const base = utilityVisualizationFixture(), source = base.sources[0];
    if (source.kind !== 'utility') throw new Error('Expected utility source');
    const definition: VisualizationDefinition = { ...base,
      sources: [{  ...source, selectionMode: 'meter' as const, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a', 'meter-b'] } }],
      series: [...base.series, { ...base.series[0], id: 'energy-b', resourceGuid: 'meter-b' }] };
    const evidence = visualizationEvidenceFixture(definition);
    expect(checkVisualizationCompatibility(definition, [evidence]).state).toBe('compatible');
    expect(reasonCodes(definition, [{ ...evidence, request: { ...evidence.request, series: [...evidence.request.series].reverse() } }])).toContain('stale');
  });

  it('requires source measures, aggregations and settings to be declared', () => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    expect(reasonCodes(definition, [{ ...evidence, capabilities: { ...evidence.capabilities, measures: [], aggregations: [], settings: [] } }])).toContain('capability');
  });

  it('requires selected metrics to exist in provider output', () => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    const changed = replaceResolved(evidence, { series: ready(evidence).series.map(series => ({ ...series, metric: 'cost' })) });
    expect(reasonCodes(definition, [changed])).toContain('series');
  });

  it('does not silently drop a missing fixed source or accept a same-ID wrong-kind substitute', () => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    const changed = replaceResolved(evidence, { references: [{ kind: 'predictor', id: 'meter-a', accountGuid: 'account-a', facilityGuid: 'facility-a' }] });
    expect(reasonCodes(definition, [changed])).toContain('missing-source');
  });

  it.each([
    { groupBy: 'meter' as const, kind: 'meter' as const, guid: 'meter-a' },
    { groupBy: 'group' as const, kind: 'meter-group' as const, guid: 'group-a' },
    { groupBy: 'facility' as const, kind: 'facility' as const, guid: 'facility-a' }
  ])('requires the correct $kind reference for rule-derived $groupBy series', ({ groupBy, kind, guid }) => {
    const base = utilityVisualizationFixture(), source = base.sources[0];
    if (source.kind !== 'utility') throw new Error('Expected utility source');
    const definition: VisualizationDefinition = { ...base,
      sources: [{  ...source, groupBy, selectionMode: 'rule' as const, selection: { kind: 'rule', resource: 'meter', filter: {} } }],
      series: base.series.map(series => ({ ...series, resourceGuid: guid })) };
    const evidence = visualizationEvidenceFixture(definition);
    const reference = { id: guid, accountGuid: definition.accountGuid };
    expect(reasonCodes(definition, [replaceResolved(evidence, { references: [{ ...reference, kind: 'predictor' }] })])).toContain('missing-source');
    expect(checkVisualizationCompatibility(definition, [replaceResolved(evidence, { references: [{ ...reference, kind }] })]).state).toBe('compatible');
  });

  it('requires rule anchors and account/facility ownership', () => {
    const definition = energyUseVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    expect(reasonCodes(definition, [replaceResolved(evidence, { references: [] })])).toContain('missing-source');
    expect(reasonCodes(definition, [replaceResolved(evidence, { references: ready(evidence).references.map(reference => ({ ...reference, accountGuid: 'other' })) })])).toContain('ownership');
  });

  it('validates kind and scoped ownership for every rule-expanded runtime resource', () => {
    const base = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] }), source = base.sources[0];
    if (source.kind !== 'utility') throw new Error('Expected utility source');
    const definition: VisualizationDefinition = { ...base,
      sources: [{  ...source, selectionMode: 'rule' as const, selection: { kind: 'rule', resource: 'meter', filter: {} } }],
      series: base.series.map(({ resourceGuid, ...series }) => series) };
    const initial = visualizationEvidenceFixture(definition), resolved = ready(initial);
    const evidence = replaceResolved(initial, { series: resolved.series.map(series => ({ ...series, resourceGuid: 'meter-a' })) });
    const reference = { kind: 'meter' as const, id: 'meter-a', accountGuid: 'account-a', facilityGuid: 'facility-a' };
    const anchors = resolved.references;
    const withReference = (candidate: typeof reference) => replaceResolved(evidence, { references: [...anchors, candidate] });
    expect(reasonCodes(definition, [evidence])).toContain('missing-source');
    expect(reasonCodes(definition, [replaceResolved(evidence, { references: [...anchors, { ...reference, kind: 'predictor' }] })])).toContain('missing-source');
    expect(reasonCodes(definition, [withReference({ ...reference, accountGuid: 'foreign-account' })])).toContain('ownership');
    expect(reasonCodes(definition, [withReference({ ...reference, facilityGuid: 'foreign-facility' })])).toContain('ownership');
    const valid = withReference(reference);
    expect(checkVisualizationCompatibility(definition, [valid]).state).toBe('compatible');
    const data = ready(valid).data;
    if (data.kind !== 'time-series') throw new Error('Expected time-series');
    const expanded = replaceResolved(valid, {
      series: [...ready(valid).series, { ...ready(valid).series[0], id: 'energy-b', resourceGuid: 'meter-b' }],
      references: [...ready(valid).references, { ...reference, kind: 'predictor', id: 'meter-b' }],
      data: { ...data, rows: data.rows.map(row => ({ ...row, values: { ...row.values, 'energy-b': observed(0) } })) }
    });
    expect(reasonCodes(definition, [expanded])).toContain('missing-source');
    expect(checkVisualizationCompatibility(definition, [replaceResolved(expanded, {
      references: [...ready(valid).references, { ...reference, id: 'meter-b' }]
    })]).state).toBe('compatible');
  });

  it('keeps generic per-meter series within the saved fixed meter selection', () => {
    const base = utilityVisualizationFixture();
    const definition: VisualizationDefinition = { ...base, series: base.series.map(({ resourceGuid, ...series }) => series) };
    const evidence = visualizationEvidenceFixture(definition), resolved = ready(evidence);
    const otherMeter = { kind: 'meter' as const, id: 'unselected-meter', accountGuid: 'account-a', facilityGuid: 'facility-a' };
    const substituted = replaceResolved(evidence, {
      references: [...resolved.references, otherMeter],
      series: resolved.series.map(series => ({ ...series, resourceGuid: otherMeter.id }))
    });
    expect(reasonCodes(definition, [substituted])).toContain('series');
    expect(captureVisualizationDefinition(definition, [substituted], faithful).state).toBe('unsupported');
    const selected = replaceResolved(substituted, { series: resolved.series.map(series => ({ ...series, resourceGuid: 'meter-a' })) });
    expect(checkVisualizationCompatibility(definition, [selected]).state).toBe('compatible');
    const mixed = replaceResolved(selected, {
      series: [...ready(selected).series, { ...ready(selected).series[0], id: 'unselected-energy', resourceGuid: otherMeter.id }],
      data: { kind: 'time-series', rows: [{ periodKey: '2025-01', start: '2025-01-01', end: '2025-01-31',
        values: { energy: observed(0), 'unselected-energy': observed(1) } }] }
    });
    expect(reasonCodes(definition, [mixed])).toContain('series');
  });

  it.each(['rule', 'fixed'] as const)('rejects known facility ownership outside a portfolio %s selection', kind => {
    const base = utilityVisualizationFixture(), source = base.sources[0];
    if (source.kind !== 'utility') throw new Error('Expected utility source');
    const definition: VisualizationDefinition = { ...base,
      sources: [{ ...source, selectionMode: kind === 'rule' ? 'rule' : 'facility', selection: kind === 'rule'
        ? { kind: 'rule', resource: 'meter', filter: { facilityGuids: ['facility-a'] } }
        : { kind: 'fixed', resource: 'facility', guids: ['facility-a'] } }],
      series: base.series.map(({ resourceGuid, ...series }) => series) };
    const evidence = visualizationEvidenceFixture(definition), resolved = ready(evidence);
    const meter = { kind: 'meter' as const, id: 'meter-b', accountGuid: 'account-a', facilityGuid: 'facility-b' };
    const outside = replaceResolved(evidence, {
      references: [...resolved.references, meter],
      series: resolved.series.map(series => ({ ...series, resourceGuid: meter.id }))
    });
    expect(reasonCodes(definition, [outside])).toContain('ownership');
    expect(captureVisualizationDefinition(definition, [outside], faithful).state).toBe('unsupported');
    expect(resolveVisualizationEmbedding(definition, context, [outside]).state).toBe('unavailable');
    const inside = replaceResolved(outside, { references: [...resolved.references, { ...meter, facilityGuid: 'facility-a' }] });
    expect(checkVisualizationCompatibility(definition, [inside]).state).toBe('compatible');
    expect(captureVisualizationDefinition(definition, [inside], faithful).state).toBe('supported');
    expect(resolveVisualizationEmbedding(definition, context, [inside]).state).toBe('configured');
  });

  it('applies explicit facility constraints to named charge identities without a per-resource series', () => {
    const base = utilityVisualizationFixture(), source = base.sources[0];
    if (source.kind !== 'utility') throw new Error('Expected utility source');
    const definition: VisualizationDefinition = { ...base,
      sources: [{  ...source, measure: 'charge', groupBy: 'total', dataMode: 'billing-period',
        selectionMode: 'facility' as const, selection: { kind: 'fixed', resource: 'facility', guids: ['facility-a'] },
        charge: { meterGuid: 'meter-b', chargeGuid: 'charge-b', measure: 'usage' } }],
      series: [{ id: 'charge', sourceId: source.id, metric: 'charge', axis: 'left' }],
      chart: { kind: 'time-series', type: 'line', interval: 'native', stack: 'none' } };
    const evidence = visualizationEvidenceFixture(definition), resolved = ready(evidence);
    const outside = replaceResolved(evidence, {
      references: resolved.references.map(reference => reference.kind === 'facility' ? reference : { ...reference, facilityGuid: 'facility-b' }),
      periods: resolved.periods.map(period => ({ ...period, interval: 'billing-period' })),
      alignment: { kind: 'billing-occurrence', key: 'bill-guid' }
    });
    expect(reasonCodes(definition, [outside])).toContain('ownership');
    expect(captureVisualizationDefinition(definition, [outside], faithful).state).toBe('unsupported');
    expect(resolveVisualizationEmbedding(definition, context, [outside]).state).toBe('unavailable');
    const inside = replaceResolved(outside, { references: ready(outside).references.map(reference => ({ ...reference, facilityGuid: 'facility-a' })) });
    expect(checkVisualizationCompatibility(definition, [inside]).state).toBe('compatible');
  });

  it('does not replace a missing pinned model with the selected model', () => {
    const definition = analysisVisualizationFixture(true); const evidence = visualizationEvidenceFixture(definition);
    expect(reasonCodes(definition, [replaceResolved(evidence, { references: ready(evidence).references.filter(reference => reference.id !== 'model-a') })])).toContain('missing-source');
  });

  it('requires current authoritative analysis results', () => {
    const definition = analysisVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    expect(reasonCodes(definition, [replaceResolved(evidence, { analysisFreshness: 'stale' })])).toContain('stale');
  });

  it.each([NaN, Infinity, -Infinity])('rejects a nonfinite observation: %s', value => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    expect(reasonCodes(definition, [replaceResolved(evidence, { data: { kind: 'time-series', rows: [{ periodKey: 'bad', start: '2025-01-01', end: '2025-01-31', values: { energy: observed(value) } }] } })])).toContain('data');
  });

  it('rejects negative Sankey links without modifying the supplied data', () => {
    const definition = energyUseVisualizationFixture(true); const evidence = visualizationEvidenceFixture(definition);
    const data = ready(evidence).data; if (data.kind !== 'flow') throw new Error('Expected flow');
    const changed = replaceResolved(evidence, { data: { ...data, links: data.links.map(link => ({ ...link, observation: observed(-3) })) } });
    expect(reasonCodes(definition, [changed])).toContain('data');
    expect((ready(changed).data as typeof data).links[0].observation.value).toBe(-3);
  });

  it('requires conversion to the pinned unit and pinned site/source treatment', () => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    expect(reasonCodes(definition, [replaceResolved(evidence, { series: ready(evidence).series.map(series => ({ ...series, unit: 'MMBtu', energyTreatment: 'source' })) })])).toContain('units');
  });

  it('allows multiple distinct fiscal years but rejects incompatible intervals within one fiscal slot', () => {
    const base = energyUseVisualizationFixture(), source = base.sources[0];
    if (source.kind !== 'energy-use') throw new Error('Expected Energy Use source');
    const definition: VisualizationDefinition = { ...base, facilitySelection: { kind: 'all' },
      sources: [{ ...source, selection: { kind: 'rule', resource: 'equipment', filter: {} } }] };
    const evidence = visualizationEvidenceFixture(definition);
    const first = ready(evidence).periods[0];
    const differentYear = { ...first, fiscalYear: 2024, start: '2023-10-01', end: '2024-09-30' };
    expect(checkVisualizationCompatibility(definition, [replaceResolved(evidence, { periods: [first, differentYear] })]).state).toBe('compatible');
    const incompatible = { ...first, facilityGuid: 'facility-b', start: '2025-01-01', end: '2025-12-31' };
    expect(reasonCodes(definition, [replaceResolved(evidence, { periods: [first, incompatible] })])).toContain('period');
    const comparisonDefinition: VisualizationDefinition = { ...definition, comparison: { kind: 'custom', start: incompatible.start, end: incompatible.end } };
    expect(checkVisualizationCompatibility(comparisonDefinition, [replaceResolved(visualizationEvidenceFixture(comparisonDefinition),
      { periods: [first, { ...incompatible, role: 'comparison' }] })]).state).toBe('compatible');
  });

  it('rejects annual estimates as monthly observations', () => {
    const definition = { ...energyUseVisualizationFixture(), chart: { kind: 'time-series' as const, type: 'line' as const, interval: 'monthly' as const, stack: 'none' as const } };
    const evidence = visualizationEvidenceFixture(definition);
    expect(reasonCodes(definition, [evidence])).toContain('period');
  });

  it.each([
    ['facility scope', energyUseVisualizationFixture()],
    ['portfolio rule filter', (() => {
      const base = utilityVisualizationFixture(), source = base.sources[0];
      if (source.kind !== 'utility') throw new Error('Expected utility source');
      return { ...base, sources: [{  ...source, selectionMode: 'rule' as const, selection: { kind: 'rule', resource: 'meter', filter: { facilityGuids: ['facility-a'] } } }],
        series: base.series.map(({ resourceGuid, ...series }) => series) } as VisualizationDefinition;
    })()],
    ['portfolio fixed facility', (() => {
      const base = utilityVisualizationFixture(), source = base.sources[0];
      if (source.kind !== 'utility') throw new Error('Expected utility source');
      return { ...base, sources: [{  ...source, selectionMode: 'facility' as const, selection: { kind: 'fixed', resource: 'facility', guids: ['facility-a'] } }],
        series: base.series.map(({ resourceGuid, ...series }) => series) } as VisualizationDefinition;
    })()]
  ])('checks explicit resolved period owners against %s', (_, definition) => {
    const evidence = visualizationEvidenceFixture(definition), resolved = ready(evidence);
    const outside = replaceResolved(evidence, { periods: resolved.periods.map(period => ({ ...period, facilityGuid: 'foreign-facility' })) });
    expect(reasonCodes(definition, [outside])).toContain('ownership');
    expect(captureVisualizationDefinition(definition, [outside], faithful).state).toBe('unsupported');
    expect(resolveVisualizationEmbedding(definition, context, [outside]).state).toBe('unavailable');
    const inside = replaceResolved(evidence, { periods: resolved.periods.map(period => ({ ...period, facilityGuid: 'facility-a' })) });
    expect(checkVisualizationCompatibility(definition, [inside]).state).toBe('compatible');
  });
});

describe('resolved period and observation fidelity', () => {
  function comparedFixture(): VisualizationDefinition {
    return { ...utilityVisualizationFixture(), period: { kind: 'fixed', start: '2024-01-01', end: '2024-12-31', basis: 'calendar' },
      comparison: { kind: 'custom', start: '2023-01-01', end: '2023-12-31' } };
  }
  it('accepts fixed/custom results only with their original primary/comparison dates', () => {
    const definition = comparedFixture(), evidence = visualizationEvidenceFixture(definition);
    expect(checkVisualizationCompatibility(definition, [evidence]).state).toBe('compatible');
    const unrelated = ready(visualizationEvidenceFixture(utilityVisualizationFixture()));
    expect(reasonCodes(definition, [replaceResolved(evidence, unrelated)])).toContain('period');
  });
  it.each([
    { start: '2025-12-31', end: '2025-01-01' }, { start: '2025-02-30', end: '2025-03-01' }
  ])('rejects invalid resolved civil intervals: %j', range => {
    const definition = utilityVisualizationFixture(), evidence = visualizationEvidenceFixture(definition);
    expect(reasonCodes(definition, [replaceResolved(evidence, { periods: ready(evidence).periods.map(period => ({ ...period, ...range })) })])).toContain('period');
  });
  it('requires requested comparison periods and forbids unrequested comparison roles', () => {
    const definition = comparedFixture(), evidence = visualizationEvidenceFixture(definition);
    expect(reasonCodes(definition, [replaceResolved(evidence, { periods: ready(evidence).periods.filter(period => period.role === 'primary') })])).toContain('period');
    const plain = utilityVisualizationFixture(), unrequested = visualizationEvidenceFixture(plain), period = ready(unrequested).periods[0];
    expect(reasonCodes(plain, [replaceResolved(unrequested, { periods: [period, { ...period, role: 'comparison' }] })])).toContain('period');
  });
  it('allows partial native overlap and lagging coverage while rejecting rows outside the requested or declared interval', () => {
    const definition: VisualizationDefinition = { ...utilityVisualizationFixture(), period: { kind: 'fixed', basis: 'calendar', start: '2024-01-15', end: '2024-01-20' } };
    const evidence = visualizationEvidenceFixture(definition);
    const native = { role: 'primary' as const, interval: 'monthly' as const, basis: 'calendar' as const, start: '2024-01-01', end: '2024-01-31' };
    const row = { periodKey: '2024-01', start: native.start, end: native.end, values: { energy: observed(0) } };
    const supported = replaceResolved(evidence, { periods: [native], data: { kind: 'time-series', rows: [row] } });
    expect(checkVisualizationCompatibility(definition, [supported]).state).toBe('compatible');
    expect(reasonCodes(definition, [replaceResolved(supported, { periods: [{ ...native, end: '2024-12-31' }],
      data: { kind: 'time-series', rows: [{ ...row, start: '2024-02-01', end: '2024-02-29' }] } })])).toContain('period');
    expect(reasonCodes(definition, [replaceResolved(supported, { periods: [{ ...native, start: '2024-01-15', end: '2024-01-20' }] })])).toContain('period');
    const annualRequest: VisualizationDefinition = { ...definition, period: { kind: 'fixed', basis: 'calendar', start: '2024-01-01', end: '2024-12-31' } };
    const lagging = replaceResolved(visualizationEvidenceFixture(annualRequest), { periods: [native], data: { kind: 'time-series', rows: [row] }, quality: { partial: true, warnings: ['Later readings unavailable.'] } });
    expect(checkVisualizationCompatibility(annualRequest, [lagging]).state).toBe('compatible');
  });
  it('rejects rows relabeled under different declared dates or reversed row intervals', () => {
    const definition = comparedFixture(), evidence = visualizationEvidenceFixture(definition), data = ready(evidence).data;
    if (data.kind !== 'time-series') throw new Error('Expected table');
    const rows = data.rows.map(row => row.role === 'comparison' ? row : { ...row, start: '2025-01-01', end: '2025-01-31' });
    expect(reasonCodes(definition, [replaceResolved(evidence, { data: { ...data, rows } })])).toContain('period');
    const reversed = data.rows.map(row => ({ ...row, start: '2024-12-31', end: '2024-01-01' }));
    expect(reasonCodes(definition, [replaceResolved(evidence, { data: { ...data, rows: reversed } })])).toContain('period');
  });
  it('rejects unrelated observation keys and selected series that disappear from a ready table', () => {
    const definition = utilityVisualizationFixture(), evidence = visualizationEvidenceFixture(definition), data = ready(evidence).data;
    if (data.kind !== 'time-series') throw new Error('Expected table');
    const unrelated = data.rows.map(row => ({ ...row, values: { unrelated: observed(0) } }));
    expect(reasonCodes(definition, [replaceResolved(evidence, { data: { ...data, rows: unrelated } })])).toContain('series');
    expect(reasonCodes(definition, [replaceResolved(evidence, { data: { ...data, rows: data.rows.map(row => ({ ...row, values: {} })) } })])).toContain('series');
    expect(reasonCodes(definition, [replaceResolved(evidence, { data: { ...data, rows: [] } })])).toContain('data');
  });
  it.each(['missing', 'excluded', 'alignment-padding'] as const)('accepts an explicit %s comparison observation instead of silently omitting it', state => {
    const definition = comparedFixture(), evidence = visualizationEvidenceFixture(definition), data = ready(evidence).data;
    if (data.kind !== 'time-series') throw new Error('Expected table');
    const rows = data.rows.map(row => row.role === 'comparison' ? { ...row, values: { energy: { state, value: null, reason: 'No applicable observation.' } } } : row);
    expect(checkVisualizationCompatibility(definition, [replaceResolved(evidence, { data: { ...data, rows } })]).state).toBe('compatible');
    expect(reasonCodes(definition, [replaceResolved(evidence, { data: { ...data, rows: data.rows.filter(row => row.role !== 'comparison') } })])).toContain('series');
  });
  it('uses matrix series IDs only for series-period heatmaps, retaining calendar labels for month-year heatmaps', () => {
    const definition: VisualizationDefinition = { ...utilityVisualizationFixture(), chart: { kind: 'heatmap', dimension: 'month-year', scale: 'linear' } };
    const evidence = visualizationEvidenceFixture(definition), data: VisualizationData = { kind: 'matrix', cells: [{ row: 'January', column: '2025', observation: observed(0) }] };
    expect(checkVisualizationCompatibility(definition, [replaceResolved(evidence, { data })]).state).toBe('compatible');
    const seriesPeriod: VisualizationDefinition = { ...definition, chart: { kind: 'heatmap', dimension: 'series-period', scale: 'linear' } };
    expect(reasonCodes(seriesPeriod, [replaceResolved(visualizationEvidenceFixture(seriesPeriod), { data })])).toContain('series');
  });
});

describe('mixed-source eligibility', () => {
  function additiveFixture(stack: 'none' | 'absolute' = 'absolute'): VisualizationDefinition {
    const base = utilityVisualizationFixture();
    return { ...base, sources: [...base.sources, {  ...base.sources[0], id: 'other', kind: 'utility', measure: 'energy',
      aggregation: 'sum', dataMode: 'calendarized', groupBy: 'meter', selectionMode: 'meter' as const, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-b'] } }],
      series: [...base.series, { id: 'other-energy', sourceId: 'other', metric: 'energy', resourceGuid: 'meter-b', axis: 'left' }],
      chart: { kind: 'time-series', type: 'area', interval: 'monthly', stack } };
  }
  function mixedFixture(): VisualizationDefinition {
    const utility = utilityVisualizationFixture();
    return { ...utility, sources: [...utility.sources, { id: 'predictor', kind: 'predictor', measure: 'value', aggregation: 'none', selection: { kind: 'fixed', resource: 'predictor', guids: ['predictor-a'] } }],
      series: [...utility.series, { id: 'temperature', sourceId: 'predictor', metric: 'value', resourceGuid: 'predictor-a', axis: 'right' }] };
  }
  function mixedEvidence(definition: VisualizationDefinition) {
    const utility = visualizationEvidenceFixture(definition), predictor = visualizationEvidenceFixture(definition, 1);
    return [utility, replaceResolved(predictor, { series: ready(predictor).series.map(series => ({ ...series, unit: 'degC', dimension: 'temperature', additive: false })) })];
  }
  it('permits aligned utility and predictor observations on distinct axes', () => {
    const definition = mixedFixture(); expect(checkVisualizationCompatibility(definition, mixedEvidence(definition)).state).toBe('compatible');
  });
  it('permits only disjoint authoritative contributions in additive stacks', () => {
    const definition = additiveFixture(), first = visualizationEvidenceFixture(definition), second = visualizationEvidenceFixture(definition, 1);
    expect(checkVisualizationCompatibility(definition, [first, second]).state).toBe('compatible');
    const overlapping = replaceResolved(second, { series: ready(second).series.map(series => ({ ...series, contributionKeys: ready(first).series[0].contributionKeys })) });
    expect(reasonCodes(definition, [first, overlapping])).toContain('data');
    const unproven = replaceResolved(second, { series: ready(second).series.map(series => ({ ...series, contributionKeys: [] })) });
    expect(reasonCodes(definition, [first, unproven])).toContain('data');
  });
  it('permits site/source energy comparisons but rejects their combined stack', () => {
    const initial = additiveFixture('none');
    const definition: VisualizationDefinition = { ...initial, sources: initial.sources.map((source, index) => ({ ...source,
      settings: { ...source.settings, energyTreatment: { kind: 'pinned', value: index ? 'source' : 'site' } } })) };
    expect(checkVisualizationCompatibility(definition, [visualizationEvidenceFixture(definition), visualizationEvidenceFixture(definition, 1)]).state).toBe('compatible');
    const stacked: VisualizationDefinition = { ...definition, chart: { kind: 'time-series', type: 'area', interval: 'monthly', stack: 'absolute' } };
    expect(reasonCodes(stacked, [visualizationEvidenceFixture(stacked), visualizationEvidenceFixture(stacked, 1)])).toContain('units');
  });
  it('rejects mixed units/currencies on one axis and nonadditive stacking', () => {
    const base = mixedFixture(); const definition = { ...base, series: base.series.map(series => ({ ...series, axis: 'left' as const })) };
    expect(reasonCodes(definition, mixedEvidence(definition))).toContain('units');
    const stacked = { ...base, chart: { kind: 'time-series' as const, type: 'area' as const, interval: 'monthly' as const, stack: 'absolute' as const } };
    expect(reasonCodes(stacked, mixedEvidence(stacked))).toContain('units');
  });
  it('does not require scatter X/Y quantities to have the same unit', () => {
    const base = mixedFixture(); const definition = { ...base, series: base.series.map(series => ({ ...series, axis: 'left' as const })),
      chart: { kind: 'scatter' as const, xSeriesId: 'temperature', ySeriesId: 'energy', showFit: false } };
    expect(checkVisualizationCompatibility(definition, mixedEvidence(definition)).state).toBe('compatible');
  });
  it('requires explicit common observation alignment and rejects unexpected evidence', () => {
    const definition = mixedFixture(), [utility, predictor] = mixedEvidence(definition);
    expect(reasonCodes(definition, [utility, replaceResolved(predictor, { alignment: { kind: 'billing-occurrence', key: 'bill-start-and-occurrence' } })])).toContain('period');
    expect(reasonCodes(definition, [utility, predictor, { ...predictor, request: { ...predictor.request, identity: { ...predictor.request.identity, sourceId: 'unknown' } } }])).toContain('missing-source');
  });
  it('rejects per-source rolling anchors instead of shifting each source to its own latest date', () => {
    const definition: VisualizationDefinition = { ...mixedFixture(), period: { kind: 'rolling', count: 12, unit: 'month', anchor: 'latest-data', basis: 'calendar', includeIncomplete: true } };
    const [utility, predictor] = mixedEvidence(definition);
    expect(checkVisualizationCompatibility(definition, [utility, predictor]).state).toBe('compatible');
    const changed = { ...predictor, request: { ...predictor.request, dateContext: { calendarDate: '2026-11-11', latestDataDate: '2025-09-30' } } };
    expect(reasonCodes(definition, [utility, changed])).toContain('stale');
    expect(reasonCodes(definition, [utility, { ...predictor, request: { ...predictor.request, dateContext: { calendarDate: '2026-02-30' } } }])).toContain('stale');
  });
});

describe('capture and linked embedding contracts', () => {
  it('captures independent intent only after full fidelity and compatibility proof', () => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    const result = captureVisualizationDefinition(definition, [evidence], faithful);
    expect(result.state).toBe('supported');
    if (result.state !== 'supported') throw new Error('Expected supported capture');
    expect(result.definition).toEqual(definition); expect(result.definition).not.toBe(definition);
  });
  it.each([
    { ...faithful, sourceIdentities: 'unsaved' as const }, { ...faithful, omissions: ['banking gaps'] },
    { ...faithful, preserved: ['sources'] as const }
  ])('blocks reduced or unsaved capture: %j', fidelity => {
    const definition = analysisVisualizationFixture(true);
    expect(captureVisualizationDefinition(definition, [visualizationEvidenceFixture(definition)], fidelity).state).toBe('unsupported');
  });
  it('does not save transient zoom or generated chart options on capture', () => {
    const definition = utilityVisualizationFixture();
    expect(captureVisualizationDefinition({ ...definition, zoom: { start: 30, end: 80 } }, [visualizationEvidenceFixture(definition)], faithful).state).toBe('unsupported');
  });
  it('keeps cross-scope same-account embeddings linked to the original source scope', () => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    const result = resolveVisualizationEmbedding(definition, context, [evidence]);
    expect(result.state).toBe('configured');
    if (result.state === 'configured') expect(result.definition.facilitySelection).toEqual({ kind: 'all' });
  });
  it('ignores dashboard filters unless date inheritance is explicitly selected', () => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    const result = resolveVisualizationEmbedding(definition, { ...context, dashboardPeriod: { kind: 'fiscal-year', year: 2020 } }, [evidence]);
    expect(result.state).toBe('configured'); if (result.state === 'configured') expect(result.definition.period).toEqual(definition.period);
  });
  it('requires fresh resolution for opted-in dates and gives widget dates precedence', () => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    const period = { kind: 'fixed' as const, basis: 'calendar' as const, start: '2024-01-01', end: '2024-12-31' };
    const result = resolveVisualizationEmbedding(definition, { ...context, dashboardPeriod: { kind: 'fiscal-year', year: 2020 },
      dates: { kind: 'override', followDashboard: true, period } }, [evidence]);
    expect(result.state).toBe('requires-resolution');
    if (result.state !== 'unavailable') expect(result.definition.period).toEqual(period);
    expect(definition.period).toEqual({ kind: 'all-history' });
    const effective = { ...definition, period };
    expect(resolveVisualizationEmbedding(definition, { ...context, dates: { kind: 'override', followDashboard: false, period } },
      [visualizationEvidenceFixture(effective)]).state).toBe('configured');
  });
  it('uses opted-in dashboard dates when no widget period is supplied', () => {
    const definition = utilityVisualizationFixture(), evidence = visualizationEvidenceFixture(definition);
    const result = resolveVisualizationEmbedding(definition, { ...context, dashboardPeriod: { kind: 'fiscal-year', year: 2024 },
      dates: { kind: 'override', followDashboard: true } }, [evidence]);
    expect(result.state).toBe('requires-resolution'); if (result.state !== 'unavailable') expect(result.definition.period).toEqual({ kind: 'fiscal-year', year: 2024 });
  });
  it('rejects unsupported or malformed overrides and cross-account references', () => {
    const definition = utilityVisualizationFixture(); const evidence = visualizationEvidenceFixture(definition);
    const period = { kind: 'fiscal-year' as const, year: 2020 };
    expect(resolveVisualizationEmbedding(definition, { ...context, hostAccountGuid: 'other' }, [evidence]).state).toBe('unavailable');
    expect(resolveVisualizationEmbedding(definition, { ...context, dates: { kind: 'override', followDashboard: true } }, [evidence]).state).toBe('unavailable');
    expect(resolveVisualizationEmbedding(definition, { ...context, dates: { kind: 'override', followDashboard: false, period } },
      [{ ...evidence, capabilities: { ...evidence.capabilities, allowDateOverride: false } }]).state).toBe('unavailable');
    expect(resolveVisualizationEmbedding(definition, { ...context, dates: { kind: 'override', followDashboard: false,
      period: { kind: 'fixed', start: '2024-02-30', end: '2024-03-31', basis: 'calendar' } } }, [evidence]).state).toBe('unavailable');
    expect(resolveVisualizationEmbedding(definition, { ...context, scope: { kind: 'portfolio' } } as VisualizationEmbeddingContext, [evidence]).state).toBe('unavailable');
  });
  it('reports missing definitions as repairable widget placeholders', () => {
    expect(resolveVisualizationEmbedding(undefined, context, []).state).toBe('unavailable');
  });
});
