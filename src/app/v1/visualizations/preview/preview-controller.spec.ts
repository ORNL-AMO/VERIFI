import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { visualizationEvidenceFixture } from '@domain/visualizations/testing/visualization-provider-fixtures';
import type { VisualizationSourceProvider, VisualizationSourceRequest, VisualizationSourceResolution } from '@domain/visualizations/visualization-source-provider';
import { PreviewController } from './preview-controller';
import { PreviewDateContextResolver, PreviewIdentity, PreviewPresentation, VISUALIZATION_DATE_CONTEXT_RESOLVER,
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
  TestBed.configureTestingModule({ providers: [PreviewController,
    { provide: VISUALIZATION_SOURCE_PROVIDERS, useValue: options.empty ? [] : [provider] },
    { provide: VISUALIZATION_PREVIEW_PRESENTERS, useValue: options.empty ? [] : [presenter] },
    { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useValue: options.empty ? undefined : options.dates ?? dates }] });
  return { controller: TestBed.inject(PreviewController), definition, evidence, provider };
}

describe('visualization preview orchestration', () => {
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
