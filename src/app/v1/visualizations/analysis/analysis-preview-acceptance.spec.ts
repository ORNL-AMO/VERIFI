import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { accountAnalysisDefinition, accountAnalysisFixture, analysisDefinition } from '@domain/visualizations/testing/analysis-fixtures';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { calculateAccountAnalysisResults } from '@domain/calculations/analysis-calculations/account-analysis-results-calculation';
import { calculateFacilityAnalysisResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import { calculateFacilityAnalysisGroupResults } from '@domain/calculations/analysis-calculations/facility-analysis-group-results-calculation';
import type { AccountAnalysisResultsWorkerRequest } from '@platform/web-workers/account-analysis-results-worker.contract';
import type { FacilityAnalysisResultsWorkerRequest } from '@platform/web-workers/facility-analysis-results-worker.contract';
import type { FacilityAnalysisGroupResultsWorkerRequest } from '@platform/web-workers/facility-analysis-group-results-worker.contract';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { VisualizationsModule } from '../visualizations.module';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { PreviewController } from '../preview/preview-controller';
import { TimeSeriesPresenter } from '../time-series/time-series.presenter';

type Request = AccountAnalysisResultsWorkerRequest | FacilityAnalysisResultsWorkerRequest | FacilityAnalysisGroupResultsWorkerRequest;
class ControlledWorker {
  static instances: ControlledWorker[] = [];
  readonly terminate = vi.fn();
  private readonly listeners = new Map<string, (event: { data: unknown }) => void>();
  payload!: Request;
  constructor() { ControlledWorker.instances.push(this); }
  addEventListener(type: string, listener: (event: { data: unknown }) => void) { this.listeners.set(type, listener); }
  postMessage(payload: Request) { this.payload = payload; }
  reply(error?: string) {
    const value = error ? undefined : 'accountAnalysisItem' in this.payload ? calculateAccountAnalysisResults(this.payload)
      : 'groupGuid' in this.payload ? calculateFacilityAnalysisGroupResults(this.payload) : calculateFacilityAnalysisResults(this.payload);
    this.listeners.get('message')?.({ data: error ? { ok: false, message: error } : { ok: true, value } });
  }
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function setup() {
  const fixture = accountAnalysisFixture(), store = new AccountWorkspaceStore(); store.publish(fixture.snapshot);
  const base = { state: 'ready' as const, inputFingerprint: 'canonical', meters: fixture.meters, accountGuid: 'account-a' };
  const acquire = vi.fn(async () => ({ snapshot: store.snapshot(), base }));
  TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [PreviewController,
    { provide: AccountWorkspaceStore, useValue: store }, { provide: UtilityDataSession, useValue: { acquire } },
    { provide: WorkspaceCalendarizationService, useValue: { currentInputFingerprint: () => 'canonical', project: (_base: unknown, input: { meterGuids: string[] }) => ({ state: 'ready', meters: fixture.meters.filter(meter => input.meterGuids.includes(meter.meter.guid)) }) } }
  ] });
  const controller = TestBed.inject(PreviewController), presenter = TestBed.inject(TimeSeriesPresenter); TestBed.tick();
  let revision = 0;
  const update = (definition = analysisDefinition(), active = true) => controller.update(definition, {
    accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: 'acceptance', definitionRevision: ++revision
  }, active);
  return { fixture, store, controller, presenter, acquire, update };
}
async function worker(index: number) { await vi.waitFor(() => expect(ControlledWorker.instances.length).toBeGreaterThan(index)); return ControlledWorker.instances[index]; }
async function state(controller: PreviewController, expected: string) { await vi.waitFor(() => expect(controller.state().state, JSON.stringify(controller.state())).toBe(expected)); }
const targets: readonly [string, () => VisualizationDefinition][] = [['facility', () => analysisDefinition()], ['group', () => analysisDefinition('actual', 'group-a')], ['account', () => accountAnalysisDefinition()]];

describe('composed analysis date/provider/presentation acceptance', () => {
  beforeEach(() => { ControlledWorker.instances = []; vi.stubGlobal('Worker', ControlledWorker); });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it.each(targets)('clears %s output, cancels obsolete work and cannot reuse replies from an earlier account session', async (_target, definition) => {
    const { fixture, store, controller, update } = setup();
    update(definition(), false); expect(ControlledWorker.instances).toHaveLength(0);
    update(definition()); const initial = await worker(0); initial.reply(); await state(controller, 'ready');
    store.publishCommitted({ ...fixture.snapshot, facilityAnalyses: fixture.snapshot.facilityAnalyses.map(item => ({ ...item, energyUnit: 'MMBtu' })), accountAnalyses: [{ ...fixture.analysis, energyUnit: 'MMBtu' }] }, {});
    update(definition()); expect(controller.state().state).toBe('loading'); const obsolete = await worker(1);
    store.beginLoad(true); TestBed.tick(); expect(obsolete.terminate).toHaveBeenCalledOnce();
    update(definition(), false); store.publish({ ...fixture.snapshot, account: { ...fixture.snapshot.account, guid: 'account-b' } }); TestBed.tick();
    store.publish(fixture.snapshot); TestBed.tick(); update(definition());
    const fresh = await worker(2); obsolete.reply(); expect(controller.state().state).toBe('loading');
    fresh.reply(); await state(controller, 'ready'); expect(fresh.terminate).toHaveBeenCalledOnce();
    store.publish(structuredClone(fixture.snapshot)); update(definition()); expect(controller.state().state).toBe('loading');
    const reloaded = await worker(3); reloaded.reply(); await state(controller, 'ready');
    update(definition(), false); expect(controller.state().state).toBe('inactive'); controller.destroy();
  });
  it('rejects inputs changed during shared date resolution before starting or caching result work', async () => {
    const { fixture, store, controller, acquire, update } = setup();
    const original = await acquire(), hold = deferred<typeof original>(); acquire.mockImplementationOnce(() => hold.promise);
    update(accountAnalysisDefinition()); expect(controller.state().state).toBe('loading');
    store.publishCommitted({ ...fixture.snapshot, accountAnalyses: [{ ...fixture.analysis, energyUnit: 'MMBtu' }] }, {});
    hold.resolve(original); await state(controller, 'error'); expect(ControlledWorker.instances).toHaveLength(0);
    update(accountAnalysisDefinition()); const fresh = await worker(0); fresh.reply(); await state(controller, 'ready'); controller.destroy();
  });
  it('rejects async presentation after an input change, then recalculates rather than presenting cached old values', async () => {
    const { fixture, store, controller, presenter, update } = setup(), hold = deferred<ReturnType<TimeSeriesPresenter['prepare']>>();
    const prepare = presenter.prepare.bind(presenter);
    // A presenter may prepare assets asynchronously. Keep the production numerical projection.
    const delayed = vi.spyOn(presenter, 'prepare').mockImplementationOnce(() => hold.promise as unknown as ReturnType<TimeSeriesPresenter['prepare']>);
    update(); const initial = await worker(0); initial.reply(); await vi.waitFor(() => expect(delayed).toHaveBeenCalledOnce());
    const args = delayed.mock.calls[0];
    store.publishCommitted({ ...fixture.snapshot, facilityAnalyses: fixture.snapshot.facilityAnalyses.map(item => ({ ...item, energyUnit: 'MMBtu' })) }, {});
    hold.resolve(prepare(...args)); await state(controller, 'error');
    update(); const fresh = await worker(1); fresh.reply(); await state(controller, 'ready'); controller.destroy();
  });
  it('preserves target intent through error/retry, group fallback, skip/removal and recovery without name substitution', async () => {
    const { fixture, store, controller, update } = setup(), group = analysisDefinition('actual', 'group-a');
    update(group); const failed = await worker(0); failed.reply('Transient calculation failure'); await state(controller, 'error');
    controller.retry(); const retried = await worker(1); retried.reply(); await state(controller, 'ready');
    const unfinished = { ...fixture.snapshot.facilityAnalyses[0], groups: [...fixture.snapshot.facilityAnalyses[0].groups, { ...fixture.snapshot.facilityAnalyses[0].groups[0], idbGroupId: 'unfinished', analysisType: 'regression' as const }] };
    store.publishCommitted({ ...fixture.snapshot, facilityAnalyses: [unfinished, fixture.snapshot.facilityAnalyses[1]] }, {});
    update(group); const fallback = await worker(2); expect(fallback.payload).toHaveProperty('groupGuid', 'group-a'); fallback.reply(); await state(controller, 'ready');
    const ready = controller.state(); if (ready.state !== 'ready') throw new Error('Expected fallback values'); expect(ready.presentation.details.rows).toHaveLength(24);
    store.publishCommitted({ ...fixture.snapshot, facilityAnalyses: fixture.snapshot.facilityAnalyses.map(item => ({ ...item, groups: item.groups.map(group => ({ ...group, analysisType: 'skip' as const })) })) }, {});
    update(group); await state(controller, 'missing-source'); expect(ControlledWorker.instances).toHaveLength(3);
    store.publishCommitted({ ...fixture.snapshot, facilityAnalyses: [{ ...fixture.snapshot.facilityAnalyses[0], guid: 'same-name-replacement' }, fixture.snapshot.facilityAnalyses[1]] }, {});
    update(group); await state(controller, 'missing-source'); expect(group.sources[0]).toHaveProperty('analysisGuid', 'analysis-a');
    store.publishCommitted(fixture.snapshot, {}); update(group); const recovered = await worker(3); recovered.reply(); await state(controller, 'ready'); controller.destroy();
  });
  it('reuses account numerical work for display edits but refreshes fiscal settings and clears blocked/empty results', async () => {
    const { fixture, store, controller, update } = setup();
    update(accountAnalysisDefinition()); const initial = await worker(0); initial.reply(); await state(controller, 'ready');
    store.publishCommitted({ ...fixture.snapshot, accountAnalyses: [{ ...fixture.analysis, name: 'Renamed account total' }] }, {});
    update({ ...accountAnalysisDefinition('calculated'), period: { kind: 'fixed', basis: 'calendar', start: '2021-01-01', end: '2021-12-31' }, appearance: { title: 'Display only', legend: true } });
    await state(controller, 'ready'); expect(ControlledWorker.instances).toHaveLength(1);
    const fiscal = { ...store.snapshot()!, account: { ...fixture.snapshot.account, fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true } };
    store.publishCommitted(fiscal, {}); update(accountAnalysisDefinition('total-improvement')); const refreshed = await worker(1); refreshed.reply(); await state(controller, 'ready');
    const result = controller.state(); if (result.state !== 'ready') throw new Error('Expected fiscal result');
    expect(result.presentation.details.rows[0]).toContain('2019-07-01');
    store.publishCommitted({ ...fiscal, facilities: [...fiscal.facilities, { ...fiscal.facilities[0], guid: 'new-unassigned-facility' }] }, {});
    update(accountAnalysisDefinition()); await state(controller, 'error'); expect(ControlledWorker.instances).toHaveLength(2);
    store.publishCommitted({ ...fiscal, accountAnalyses: [{ ...fixture.analysis, facilityAnalysisItems: fixture.analysis.facilityAnalysisItems.map(link => ({ ...link, analysisItemId: 'skip' })) }] }, {});
    update(accountAnalysisDefinition()); await state(controller, 'empty'); expect(ControlledWorker.instances).toHaveLength(2);
    store.publishCommitted(fiscal, {}); update(accountAnalysisDefinition()); await state(controller, 'ready'); expect(ControlledWorker.instances).toHaveLength(2); controller.destroy();
  });
  it('keeps unsupported model intent unchanged and starts no full calculation', async () => {
    const { controller, acquire, update } = setup();
    const original: VisualizationDefinition = { ...analysisDefinition(), sources: [{ id: 'source-1', kind: 'analysis', mode: 'model', analysisGuid: 'analysis-a', groupGuid: 'group-a', modelId: 'saved-model', measure: 'modeled', aggregation: 'none' }] };
    const before = structuredClone(original); update(original); await state(controller, 'incompatible'); controller.retry();
    expect(original).toEqual(before); expect(acquire).not.toHaveBeenCalled(); expect(ControlledWorker.instances).toHaveLength(0); controller.destroy();
  });
});
