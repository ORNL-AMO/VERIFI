import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { visualizationEvidenceFixture } from '@domain/visualizations/testing/visualization-provider-fixtures';
import { createVisualizationSetupDefinition, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceProvider, VisualizationSourceRequest, VisualizationSourceResolution } from '@domain/visualizations/visualization-source-provider';
import { createVisualizationChart, VISUALIZATION_CHART_CHOICES } from '../visualization-charts';
import { PreviewController } from './preview-controller';
import { PreviewDateContextResolver, PreviewIdentity, PreviewPresentation, PreviewRegistry, VISUALIZATION_DATE_CONTEXT_RESOLVER,
  VISUALIZATION_PREVIEW_PRESENTERS, VISUALIZATION_SOURCE_PROVIDERS, VisualizationPreviewPresenter } from './preview-registry';

@Component({ selector: 'app-preview-test-chart', template: '<p>Test presentation</p>' })
class TestChartComponent { }

const identity: PreviewIdentity = { accountGuid: 'account-a', definitionGuid: 'visualization-a', definitionRevision: 1, workspaceRevision: 1 };
const presentation: PreviewPresentation = { inputs: {}, details: { caption: 'Monthly energy in kWh', columns: ['Period', 'Energy'], rows: [['2025-01', '0']] } };
const dates: PreviewDateContextResolver = { resolve: async () => ({ calendarDate: '2026-11-11', latestDataDate: '2025-12-31' }) };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }

function setup(options: { provider?: Partial<VisualizationSourceProvider>; presenter?: Partial<VisualizationPreviewPresenter>;
  dates?: PreviewDateContextResolver; empty?: boolean } = {}) {
  const definition = utilityVisualizationFixture();
  const evidence = visualizationEvidenceFixture(definition);
  const provider: VisualizationSourceProvider = { kind: 'utility', describe: () => evidence.capabilities,
    supportsChart: (_source, chart) => ({ state: 'supported', chart }),
    resolve: async request => ({ ...evidence.resolution, identity: request.identity }), ...options.provider };
  const presenter: VisualizationPreviewPresenter = { kind: 'time-series', component: TestChartComponent, prepare: () => presentation, ...options.presenter };
  TestBed.configureTestingModule({ providers: [PreviewController, PreviewRegistry,
    { provide: VISUALIZATION_SOURCE_PROVIDERS, useValue: options.empty ? [] : [provider] },
    { provide: VISUALIZATION_PREVIEW_PRESENTERS, useValue: options.empty ? [] : [presenter] },
    { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useValue: options.empty ? undefined : options.dates ?? dates }] });
  return { controller: TestBed.inject(PreviewController), definition, evidence, provider };
}

function mixedDefinition(): VisualizationDefinition {
  const utility = utilityVisualizationFixture();
  return { ...utility, sources: [...utility.sources, { id: 'temperature-source', kind: 'predictor', measure: 'value', aggregation: 'none',
    selection: { kind: 'fixed', resource: 'predictor', guids: ['predictor-a'] }, settings: { unit: { kind: 'pinned', value: 'degC' } } }],
    series: [...utility.series, { id: 'temperature', sourceId: 'temperature-source', metric: 'value', resourceGuid: 'predictor-a', axis: 'right' }] };
}

function setupMixed(options: { definition?: VisualizationDefinition; providers?: readonly Partial<VisualizationSourceProvider>[] } = {}) {
  const definition = options.definition ?? mixedDefinition();
  const evidence = definition.sources.map((_, index) => visualizationEvidenceFixture(definition, index));
  const providers: VisualizationSourceProvider[] = evidence.map((entry, index) => ({ kind: entry.capabilities.kind,
    describe: () => entry.capabilities, supportsChart: (_source, chart) => ({ state: 'supported', chart }),
    resolve: vi.fn(async request => ({ ...entry.resolution, identity: request.identity })), ...options.providers?.[index] }));
  const prepare = vi.fn<VisualizationPreviewPresenter['prepare']>(() => presentation);
  const resolveDates = vi.fn(dates.resolve);
  TestBed.configureTestingModule({ providers: [PreviewController, PreviewRegistry,
    { provide: VISUALIZATION_SOURCE_PROVIDERS, useValue: providers },
    { provide: VISUALIZATION_PREVIEW_PRESENTERS, useValue: [{ kind: 'time-series', component: TestChartComponent, prepare }] },
    { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useValue: { resolve: resolveDates } }] });
  return { controller: TestBed.inject(PreviewController), definition, evidence, providers, prepare, resolveDates };
}

describe('visualization preview orchestration', () => {
  it.each(VISUALIZATION_CHART_CHOICES)('retains $label mixed-sourceKind setup without requesting data or dates', ({ value, label }) => {
    const resolve = vi.fn(), resolveDates = vi.fn(dates.resolve), describe = vi.fn(), supportsChart = vi.fn(), prepare = vi.fn();
    const { controller } = setup({ provider: { resolve, describe, supportsChart }, presenter: { prepare }, dates: { resolve: resolveDates } });
    const definition = createVisualizationSetupDefinition({ name: 'Mixed setup', accountGuid: 'account-a', scope: { kind: 'portfolio' },
      chart: createVisualizationChart(value), sourceKinds: ['utility', 'predictor', 'energy-use', 'analysis'] });
    const original = structuredClone(definition);
    controller.update(definition, identity);
    expect(controller.state()).toMatchObject({ state: 'setup-required', message: expect.stringContaining(label) });
    expect(definition).toEqual(original);
    expect(resolveDates).not.toHaveBeenCalled(); expect(describe).not.toHaveBeenCalled();
    expect(supportsChart).not.toHaveBeenCalled(); expect(resolve).not.toHaveBeenCalled(); expect(prepare).not.toHaveBeenCalled();
  });

  it('keeps unassigned Scatter axes in setup even after mixed sources and series are selected', () => {
    const { controller, definition, providers, resolveDates, prepare } = setupMixed({
      definition: { ...mixedDefinition(), chart: { kind: 'scatter', showFit: false } }
    });
    controller.update(definition, identity);
    const state = controller.state();
    expect(state).toMatchObject({ state: 'setup-required', message: expect.stringContaining('Scatter') });
    expect(state.state === 'setup-required' && state.reasons).toContain('Choose declared X and Y series.');
    expect(resolveDates).not.toHaveBeenCalled(); expect(prepare).not.toHaveBeenCalled();
    for (const provider of providers) expect(provider.resolve).not.toHaveBeenCalled();
  });

  it('resolves compatible utility and predictor series against one shared date context and presents both', async () => {
    const { controller, definition, providers, prepare, resolveDates } = setupMixed();
    controller.update(definition, identity); await settle();
    expect(controller.state().state).toBe('ready'); expect(resolveDates).toHaveBeenCalledTimes(1); expect(prepare).toHaveBeenCalledTimes(1);
    const submitted = prepare.mock.calls[0][1];
    expect(submitted.map(entry => entry.request.source.kind)).toEqual(['utility', 'predictor']);
    expect(submitted.map(entry => entry.request.series.map(series => series.id))).toEqual([['energy'], ['temperature']]);
    expect(submitted[0].request.dateContext).toBe(submitted[1].request.dateContext);
    expect(submitted[0].request.identity.requestId).toBe(submitted[1].request.identity.requestId);
    expect(submitted.map(entry => entry.request.identity.sourceId)).toEqual(definition.sources.map(source => source.id));
    for (const provider of providers) expect(provider.resolve).toHaveBeenCalledTimes(1);
  });

  it('preserves configured mixed sources when one sourceKind has no adapter, without requesting partial data', () => {
    const resolve = vi.fn(), resolveDates = vi.fn(dates.resolve);
    const { controller } = setup({ provider: { resolve }, dates: { resolve: resolveDates } });
    const definition = mixedDefinition(), original = structuredClone(definition);
    controller.update(definition, identity);
    expect(controller.state()).toMatchObject({ state: 'unsupported', message: expect.stringContaining('saved setup is preserved') });
    expect(definition).toEqual(original); expect(resolve).not.toHaveBeenCalled(); expect(resolveDates).not.toHaveBeenCalled();
  });

  it('rejects incompatible mixed-source units on one axis before mounting the presenter', async () => {
    const base = mixedDefinition();
    const { controller, definition, prepare } = setupMixed({ definition: { ...base, series: base.series.map(series => ({ ...series, axis: 'left' })) } });
    controller.update(definition, identity); await settle();
    expect(controller.state()).toMatchObject({ state: 'incompatible', reasons: expect.arrayContaining([expect.stringContaining('compatible units')]) });
    expect(prepare).not.toHaveBeenCalled();
  });

  it('rejects mixed-source observations with different declared alignment', async () => {
    const predictor = visualizationEvidenceFixture(mixedDefinition(), 1).resolution;
    if (predictor.state !== 'ready') throw new Error('Expected ready fixture.');
    const { controller, definition, prepare } = setupMixed({ providers: [{}, { resolve: async request => ({ ...predictor, identity: request.identity,
      resolved: { ...predictor.resolved, alignment: { kind: 'civil-month', key: 'different-month-alignment' } } }) }] });
    controller.update(definition, identity); await settle();
    expect(controller.state()).toMatchObject({ state: 'incompatible', reasons: expect.arrayContaining([expect.stringContaining('same observation alignment')]) });
    expect(prepare).not.toHaveBeenCalled();
  });

  it('cancels an obsolete mixed-source request when a new incomplete setup replaces it', async () => {
    const pending = deferred<VisualizationSourceResolution>(); let submitted!: VisualizationSourceRequest; let signal!: AbortSignal;
    const { controller, definition, evidence, prepare } = setupMixed({ providers: [{}, { resolve: (request, abort) => {
      submitted = request; signal = abort; return pending.promise;
    } }] });
    controller.update(definition, identity); await settle(); expect(controller.state().state).toBe('loading');
    const next = createVisualizationSetupDefinition({ name: 'New Scatter setup', accountGuid: 'account-a', scope: { kind: 'portfolio' },
      chart: createVisualizationChart('scatter'), sourceKinds: ['utility', 'predictor'] });
    controller.update(next, { ...identity, definitionRevision: 2 });
    expect(signal.aborted).toBe(true); pending.resolve({ ...evidence[1].resolution, identity: submitted.identity }); await settle();
    expect(controller.state()).toMatchObject({ state: 'setup-required', message: expect.stringContaining('Scatter') }); expect(prepare).not.toHaveBeenCalled();
  });

  it('shows setup-required before issuing any requests for incomplete intent', async () => {
    const resolve = vi.fn(); const { controller, definition } = setup({ provider: { resolve } });
    const { chart, ...incomplete } = definition;
    controller.update({ ...incomplete, series: [] }, identity);
    expect(controller.state().state).toBe('setup-required'); expect(resolve).not.toHaveBeenCalled();
  });

  it('preserves saved setup and explains absent production adapters', () => {
    const { controller, definition } = setup({ empty: true }); controller.update(definition, identity);
    expect(controller.state().state).toBe('unsupported'); expect(definition).toEqual(utilityVisualizationFixture());
  });

  it('does not resolve a definition for another account', () => {
    const resolve = vi.fn(); const { controller, definition } = setup({ provider: { resolve } });
    controller.update(definition, { ...identity, accountGuid: 'another-account' });
    expect(controller.state().state).toBe('invalid'); expect(resolve).not.toHaveBeenCalled();
  });

  it('passes current request identity and shared date context to a compatible presenter', async () => {
    const prepare = vi.fn<VisualizationPreviewPresenter['prepare']>(() => presentation); const { controller, definition } = setup({ presenter: { prepare } });
    controller.update(definition, identity); expect(controller.state().state).toBe('loading'); await settle();
    expect(controller.state().state).toBe('ready');
    const evidence = prepare.mock.calls[0][1];
    expect(evidence[0].request.identity).toEqual({ ...identity, requestId: expect.any(String), sourceId: 'utility', scope: { kind: 'portfolio' } });
    expect(evidence[0].request.dateContext).toEqual({ calendarDate: '2026-11-11', latestDataDate: '2025-12-31' });
    const resolution = evidence[0].resolution;
    if (resolution.state !== 'ready' || resolution.resolved.data.kind !== 'time-series') throw new Error('Expected ready time-series evidence.');
    expect(resolution.resolved.data.rows[0].values.energy.value).toBe(0);
  });

  it('blocks exact unsupported chart settings before calculation', async () => {
    const resolve = vi.fn(); const prepare = vi.fn(() => presentation);
    const { controller, definition } = setup({ provider: { resolve, supportsChart: (_source, chart) => ({ state: 'unsupported', chart, reasons: ['This stacking mode is unavailable.'] }) }, presenter: { prepare } });
    controller.update(definition, identity); await settle();
    expect(controller.state().state).toBe('incompatible'); expect(resolve).not.toHaveBeenCalled(); expect(prepare).not.toHaveBeenCalled();
  });

  it('rejects claimed support for a different exact chart', async () => {
    const prepare = vi.fn(() => presentation);
    const { controller, definition } = setup({ provider: { supportsChart: () => ({ state: 'supported', chart: { kind: 'time-series', type: 'bar', interval: 'monthly', stack: 'none' } }) }, presenter: { prepare } });
    controller.update(definition, identity); await settle();
    expect(controller.state().state).toBe('incompatible'); expect(prepare).not.toHaveBeenCalled();
  });

  it.each(['empty', 'missing-source', 'error', 'unsupported', 'waiting', 'invalid-analysis'] as const)('presents %s separately from saving', async state => {
    const { controller, definition } = setup({ provider: { resolve: async request => state === 'empty'
      ? { state, identity: request.identity, message: 'No observations in this period.', periods: [] }
      : state === 'missing-source' ? { state, identity: request.identity, message: 'Repair meter-a.', references: [{ kind: 'meter', id: 'meter-a' }] }
      : { state, identity: request.identity, message: 'Source is unavailable.' } } });
    controller.update(definition, identity); await settle();
    expect(controller.state().state).toBe(state === 'waiting' ? 'loading' : state === 'invalid-analysis' ? 'error' : state);
  });

  it('does not issue source requests with an invented or invalid date anchor', async () => {
    const resolve = vi.fn(); const { controller, definition } = setup({ provider: { resolve }, dates: { resolve: async () => ({ calendarDate: '2026-02-30' }) } });
    controller.update(definition, identity); await settle();
    expect(controller.state().state).toBe('incompatible'); expect(resolve).not.toHaveBeenCalled();
  });

  it('requires the shared latest-data anchor for a rolling latest-data period', async () => {
    const resolve = vi.fn(); const { controller, definition } = setup({ provider: { resolve }, dates: { resolve: async () => ({ calendarDate: '2026-11-11' }) } });
    controller.update({ ...definition, period: { kind: 'rolling', count: 12, unit: 'month', basis: 'calendar', anchor: 'latest-data', includeIncomplete: false } }, identity); await settle();
    expect(controller.state().state).toBe('incompatible'); expect(resolve).not.toHaveBeenCalled();
  });

  it('rejects provider evidence with a stale identity', async () => {
    const base = visualizationEvidenceFixture(utilityVisualizationFixture());
    const prepare = vi.fn(() => presentation); const { controller, definition } = setup({ provider: {
      resolve: async request => ({ ...base.resolution, identity: { ...request.identity, workspaceRevision: 0 } }) }, presenter: { prepare } });
    controller.update(definition, identity); await settle();
    expect(controller.state().state).toBe('error'); expect(prepare).not.toHaveBeenCalled();
  });

  it.each(['definitionRevision', 'workspaceRevision', 'accountGuid'] as const)('rejects a late response after %s changes', async field => {
    const pending = deferred<VisualizationSourceResolution>(); let original!: VisualizationSourceRequest; let signal!: AbortSignal;
    const { controller, definition, evidence } = setup({ provider: { resolve: (request, abort) => { original = request; signal = abort; return pending.promise; } } });
    controller.update(definition, identity); await settle();
    const nextIdentity = { ...identity, [field]: field === 'accountGuid' ? 'account-b' : 2 };
    controller.update(field === 'accountGuid' ? { ...definition, accountGuid: 'account-b' } : definition, nextIdentity);
    expect(signal.aborted).toBe(true);
    pending.resolve({ ...evidence.resolution, identity: original.identity }); await settle();
    expect(controller.state().state).not.toBe('ready');
  });

  it('cancels resolution when inactive and does not publish a late result', async () => {
    const pending = deferred<VisualizationSourceResolution>(); let request!: VisualizationSourceRequest; let signal!: AbortSignal;
    const { controller, definition, evidence } = setup({ provider: { resolve: (value, abort) => { request = value; signal = abort; return pending.promise; } } });
    controller.update(definition, identity); await settle(); controller.update(definition, identity, false);
    pending.resolve({ ...evidence.resolution, identity: request.identity }); await settle();
    expect(signal.aborted).toBe(true); expect(controller.state().state).toBe('inactive');
  });

  it('cancels after destruction, including pending presentation preparation', async () => {
    const pending = deferred<PreviewPresentation>(); let signal!: AbortSignal;
    const { controller, definition } = setup({ presenter: { prepare: (_definition, _evidence, abort) => { signal = abort; return pending.promise; } } });
    controller.update(definition, identity); await settle(); controller.destroy();
    pending.resolve(presentation); await settle(); expect(signal.aborted).toBe(true); expect(controller.state().state).not.toBe('ready');
    controller.retry(); expect(controller.state().state).not.toBe('ready');
  });

  it('keeps later local input separate from a pending request snapshot', async () => {
    const pending = deferred<VisualizationSourceResolution>(); let request!: VisualizationSourceRequest;
    const { controller, definition, evidence } = setup({ provider: { resolve: value => { request = value; return pending.promise; } } });
    controller.update(definition, identity); await settle();
    (definition as { name: string }).name = 'Later input';
    pending.resolve({ ...evidence.resolution, identity: request.identity }); await settle();
    const state = controller.state(); expect(state.state).toBe('ready'); if (state.state === 'ready') expect(state.definition.name).toBe('Monthly energy');
  });

  it('requires accessible underlying values from presenters', async () => {
    const { controller, definition } = setup({ presenter: { prepare: () => ({ inputs: {}, details: { caption: '', columns: [], rows: [] } }) } });
    controller.update(definition, identity); await settle(); expect(controller.state().state).toBe('error');
  });

  it('clears ready data immediately and retries a failed calculation with a new request', async () => {
    let calls = 0; const source = visualizationEvidenceFixture(utilityVisualizationFixture());
    const { controller, definition } = setup({ provider: { resolve: async request => ++calls === 1
      ? { state: 'error', identity: request.identity, message: 'Calculation failed.' }
      : { ...source.resolution, identity: request.identity } } });
    controller.update(definition, identity); await settle(); expect(controller.state().state).toBe('error');
    controller.retry(); expect(controller.state().state).toBe('loading'); await settle(); expect(controller.state().state).toBe('ready'); expect(calls).toBe(2);
  });

  it('does not publish after an obsolete date resolver completes', async () => {
    const pending = deferred<{ calendarDate: string }>(); const resolve = vi.fn();
    const { controller, definition } = setup({ provider: { resolve }, dates: { resolve: () => pending.promise } });
    controller.update(definition, identity); controller.update(undefined, undefined); pending.resolve({ calendarDate: '2026-11-11' }); await settle();
    expect(resolve).not.toHaveBeenCalled(); expect(controller.state().state).toBe('setup-required');
  });
});
