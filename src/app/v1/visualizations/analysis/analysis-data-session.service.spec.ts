import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { analysisDefinition, analysisFixture, analysisSourceRequest } from '@domain/visualizations/testing/analysis-fixtures';
import { calculateFacilityAnalysisResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { AnalysisDataSession } from './analysis-data-session.service';
import { AnalysisSourceProvider } from './analysis-source-provider.service';

class ControlledWorker {
  static instances: ControlledWorker[] = [];
  readonly terminate = vi.fn();
  readonly listeners = new Map<string, (event: { data: unknown }) => void>();
  payload: unknown;
  constructor() { ControlledWorker.instances.push(this); }
  addEventListener(type: string, listener: (event: { data: unknown }) => void) { this.listeners.set(type, listener); }
  postMessage(payload: unknown) { this.payload = payload; }
  emit(data: unknown) { this.listeners.get('message')?.({ data }); }
}
function setup() {
  const fixture = analysisFixture(), store = new AccountWorkspaceStore(); store.publish(fixture.snapshot);
  const base = { state: 'ready' as const, inputFingerprint: 'base', accountGuid: 'account-a', meters: fixture.meters };
  const acquire = vi.fn(async () => ({ snapshot: store.snapshot(), base }));
  const project = vi.fn(() => ({ state: 'ready', meters: fixture.meters }));
  TestBed.configureTestingModule({ providers: [AnalysisDataSession, AnalysisSourceProvider, { provide: AccountWorkspaceStore, useValue: store },
    { provide: UtilityDataSession, useValue: { acquire } }, { provide: WorkspaceCalendarizationService, useValue: { currentInputFingerprint: () => 'base', project } }] });
  const data = TestBed.inject(AnalysisDataSession), provider = TestBed.inject(AnalysisSourceProvider);
  TestBed.tick();
  return { fixture, store, acquire, project, data, provider, request: analysisSourceRequest(analysisDefinition(), store.revision()) };
}
async function worker(index: number) { await vi.waitFor(() => expect(ControlledWorker.instances.length).toBeGreaterThan(index)); return ControlledWorker.instances[index]; }
describe('active facility analysis preview results', () => {
  beforeEach(() => { ControlledWorker.instances = []; vi.stubGlobal('Worker', ControlledWorker); });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); vi.useRealTimers(); });
  it('keeps catalogs idle, shares date/projection acquisition and reuses result work for date, appearance and analysis-name changes', async () => {
    const { fixture, store, acquire, data, provider, request } = setup();
    expect(acquire).not.toHaveBeenCalled(); expect(ControlledWorker.instances).toHaveLength(0);
    const abort = new AbortController(), dates = data.acquire(request, abort.signal), preview = provider.resolve(request, abort.signal);
    const first = await worker(0); first.emit({ ok: true, value: calculateFacilityAnalysisResults(fixture.request) });
    expect((await dates).state).toBe('ready'); expect((await preview).state).toBe('ready'); expect(acquire).toHaveBeenCalledOnce(); expect(first.terminate).toHaveBeenCalledOnce();
    store.publishCommitted({ ...fixture.snapshot, facilityAnalyses: [{ ...fixture.analysis, name: 'Renamed' }] }, {});
    const next = await provider.resolve({ ...request, identity: { ...request.identity, workspaceRevision: store.revision() }, period: { kind: 'fixed', basis: 'calendar', start: '2021-01-01', end: '2021-12-31' } }, new AbortController().signal);
    expect(next.state).toBe('ready'); expect(ControlledWorker.instances).toHaveLength(1);
    if (next.state === 'ready') expect(next.resolved.series[0].label).toContain('Renamed');
  });
  it('blocks invalid results, permits selected-group fallback and returns retryable errors', async () => {
    const { fixture, request: original, provider, store } = setup();
    const blocked = { ...fixture.analysis, groups: [...fixture.analysis.groups, { ...fixture.analysis.groups[0], idbGroupId: 'other-group', analysisType: 'regression' as const }] };
    store.publishCommitted({ ...fixture.snapshot, facilityAnalyses: [blocked] }, {});
    const request = { ...original, identity: { ...original.identity, workspaceRevision: store.revision() } };
    expect((await provider.resolve(request, new AbortController().signal)).state).toBe('invalid-analysis');
    const groupRequest = { ...request, ...analysisSourceRequest(analysisDefinition('actual', 'group-a'), request.identity.workspaceRevision) };
    const pending = provider.resolve(groupRequest, new AbortController().signal), first = await worker(0);
    expect(first.payload).toMatchObject({ groupGuid: 'group-a', analysisItem: { groups: [{ idbGroupId: 'group-a' }] } });
    first.emit({ ok: false, message: 'Calculation unavailable' }); expect(await pending).toMatchObject({ state: 'error', message: 'Calculation unavailable' });
    const retry = provider.resolve(groupRequest, new AbortController().signal), second = await worker(1);
    second.emit({ ok: true, value: { itemId: fixture.analysis.guid, groupGuid: 'wrong-group' } });
    expect((await retry).state).toBe('error');
    store.publishCommitted({ ...fixture.snapshot, facilityAnalyses: [{ ...blocked, groups: blocked.groups.map(group => ({ ...group, analysisType: 'regression' as const })) }] }, {});
    expect((await provider.resolve({ ...groupRequest, identity: { ...groupRequest.identity, workspaceRevision: store.revision() } }, new AbortController().signal)).state).toBe('invalid-analysis');
    expect(ControlledWorker.instances).toHaveLength(2);
  });
  it('terminates canceled work, suppresses late replies and invalidates changed calculation inputs', async () => {
    const { fixture, store, provider, request } = setup();
    const abort = new AbortController(), pending = provider.resolve(request, abort.signal), first = await worker(0);
    abort.abort(); expect((await pending).state).toBe('error'); expect(first.terminate).toHaveBeenCalledOnce();
    first.emit({ ok: true, value: calculateFacilityAnalysisResults(fixture.request) });
    store.publishCommitted({ ...fixture.snapshot, facilityAnalyses: [{ ...fixture.analysis, energyUnit: 'kWh' }] }, {});
    const next = provider.resolve({ ...request, identity: { ...request.identity, workspaceRevision: store.revision() } }, new AbortController().signal), second = await worker(1);
    expect(second.payload).toMatchObject({ analysisItem: { energyUnit: 'kWh' } });
    second.emit({ ok: true, value: calculateFacilityAnalysisResults(fixture.request) }); expect((await next).state).toBe('ready');
    expect((await provider.resolve(request, new AbortController().signal)).state).toBe('error');
    store.beginLoad(true); expect((await provider.resolve(request, new AbortController().signal)).state).toBe('error');
  });
  it('times out and terminates a hung Worker, then retries with a new Worker', async () => {
    vi.useFakeTimers();
    const { fixture, provider, request } = setup();
    const pending = provider.resolve(request, new AbortController().signal), first = await worker(0);
    await vi.advanceTimersByTimeAsync(120001);
    expect((await pending).state).toBe('error'); expect(first.terminate).toHaveBeenCalledOnce();
    const retry = provider.resolve(request, new AbortController().signal), second = await worker(1);
    second.emit({ ok: true, value: calculateFacilityAnalysisResults(fixture.request) }); expect((await retry).state).toBe('ready');
  });
  it('rejects missing/cyclic dependency closure without requesting results', async () => {
    const { fixture, store, acquire, provider, request } = setup();
    for (const bankedAnalysisItemId of ['missing', fixture.analysis.guid]) {
      store.publishCommitted({ ...fixture.snapshot, facilityAnalyses: [{ ...fixture.analysis, hasBanking: true, bankedAnalysisItemId }] }, {});
      expect((await provider.resolve({ ...request, identity: { ...request.identity, workspaceRevision: store.revision() } }, new AbortController().signal)).state).toBe('invalid-analysis');
    }
    expect(acquire).not.toHaveBeenCalled(); expect(ControlledWorker.instances).toHaveLength(0);
  });
  it.each(['missing-id', 'transitive-missing', 'transitive-missing-id', 'transitive-cycle', 'foreign-account', 'foreign-facility', 'category', 'basis'] as const)(
    'rejects a %s banking source before acquiring calculation data', async scenario => {
      const { fixture, store, acquire, provider, request } = setup();
      const analysis = { ...fixture.analysis, hasBanking: true, bankedAnalysisItemId: 'banked-source' };
      const source = { ...fixture.analysis, guid: 'banked-source' };
      switch (scenario) {
        case 'missing-id': analysis.bankedAnalysisItemId = undefined; break;
        case 'transitive-missing': source.hasBanking = true; source.bankedAnalysisItemId = 'missing'; break;
        case 'transitive-missing-id': source.hasBanking = true; source.bankedAnalysisItemId = undefined; break;
        case 'transitive-cycle': source.hasBanking = true; source.bankedAnalysisItemId = analysis.guid; break;
        case 'foreign-account': source.accountId = 'other-account'; break;
        case 'foreign-facility': source.facilityId = 'other-facility'; break;
        case 'category': source.analysisCategory = 'water'; break;
        case 'basis': source.energyIsSource = !analysis.energyIsSource; break;
      }
      store.publishCommitted({ ...fixture.snapshot, facilityAnalyses: [analysis, source] }, {});
      const message = scenario === 'transitive-cycle' ? 'The analysis banking dependencies contain a cycle.'
        : scenario === 'category' || scenario === 'basis' ? 'Analysis setup or the selected results are invalid. Review Analysis setup.'
          : 'A banked analysis is unavailable. Review Analysis setup.';
      expect(await provider.resolve({ ...request, identity: { ...request.identity, workspaceRevision: store.revision() } }, new AbortController().signal))
        .toMatchObject({ state: 'invalid-analysis', message });
      expect(acquire).not.toHaveBeenCalled(); expect(ControlledWorker.instances).toHaveLength(0);
    }
  );
});
