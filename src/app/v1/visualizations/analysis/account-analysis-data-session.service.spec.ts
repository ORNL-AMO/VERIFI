import { evaluateWorkspaceStatus } from '@app/v1/status/status.evaluator';
import type { AnalysisResultVisualizationSource } from '@domain/visualizations/visualization-definition';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { accountAnalysisDefinition, accountAnalysisFixture, accountAnalysisSourceRequest } from '@domain/visualizations/testing/analysis-fixtures';
import { calculateAccountAnalysisResults } from '@domain/calculations/analysis-calculations/account-analysis-results-calculation';
import type { AccountAnalysisResultsWorkerRequest } from '@platform/web-workers/account-analysis-results-worker.contract';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { AnalysisDataSession } from './analysis-data-session.service';
import { AnalysisSourceProvider } from './analysis-source-provider.service';

class ControlledWorker {
  static instances: ControlledWorker[] = [];
  readonly terminate = vi.fn();
  readonly listeners = new Map<string, (event: { data: unknown }) => void>();
  payload!: AccountAnalysisResultsWorkerRequest;
  constructor() { ControlledWorker.instances.push(this); }
  addEventListener(type: string, listener: (event: { data: unknown }) => void) { this.listeners.set(type, listener); }
  postMessage(payload: AccountAnalysisResultsWorkerRequest) { this.payload = payload; }
  emit(data = { ok: true, value: calculateAccountAnalysisResults(this.payload) } as unknown) { this.listeners.get('message')?.({ data }); }
}
function setup() {
  const fixture = accountAnalysisFixture(), store = new AccountWorkspaceStore(); store.publish(fixture.snapshot);
  const base = { state: 'ready' as const, inputFingerprint: 'base', accountGuid: 'account-a', meters: fixture.meters };
  const acquire = vi.fn(async () => ({ snapshot: store.snapshot(), base }));
  TestBed.configureTestingModule({ providers: [AnalysisDataSession, AnalysisSourceProvider, { provide: AccountWorkspaceStore, useValue: store },
    { provide: UtilityDataSession, useValue: { acquire } }, { provide: WorkspaceCalendarizationService, useValue: { currentInputFingerprint: () => 'base' } }] });
  const data = TestBed.inject(AnalysisDataSession), provider = TestBed.inject(AnalysisSourceProvider); TestBed.tick();
  const request = (definition = accountAnalysisDefinition()) => accountAnalysisSourceRequest(definition, store.revision());
  return { fixture, store, acquire, data, provider, request };
}
async function worker(index: number) { await vi.waitFor(() => expect(ControlledWorker.instances.length).toBeGreaterThan(index)); return ControlledWorker.instances[index]; }
describe('active saved account analysis preview', () => {
  beforeEach(() => { ControlledWorker.instances = []; vi.stubGlobal('Worker', ControlledWorker); });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); vi.useRealTimers(); });
  it('shares full-result demand, excludes skips, reuses metadata/date/measure changes and retains exact saved scope', async () => {
    const { fixture, store, data, provider, request, acquire } = setup(), before = structuredClone(fixture.snapshot);
    expect(acquire).not.toHaveBeenCalled();
    const abort = new AbortController(), dates = data.acquire(request(), abort.signal), pending = provider.resolve(request(), abort.signal);
    const first = await worker(0);
    expect(first.payload.accountFacilities.map(item => item.guid)).toEqual(['facility-a', 'facility-b']);
    expect(first.payload.allAccountAnalysisItems.map(item => item.guid)).toEqual(['analysis-a', 'analysis-b']);
    expect(first.payload.reportYear).toBeUndefined(); first.emit();
    expect((await dates).state).toBe('ready'); expect((await pending).state).toBe('ready'); expect(acquire).toHaveBeenCalledOnce();
    store.publishCommitted({ ...fixture.snapshot, accountAnalyses: [{ ...fixture.analysis, name: 'Renamed account analysis' }] }, {});
    const next = await provider.resolve(request({ ...accountAnalysisDefinition('savings'), period: { kind: 'fixed', basis: 'calendar', start: '2021-01-01', end: '2021-12-31' } }), new AbortController().signal);
    expect(next.state).toBe('ready'); if (next.state === 'ready') expect(next.resolved.series[0].label).toContain('Renamed');
    expect(ControlledWorker.instances).toHaveLength(1); expect(fixture.snapshot).toEqual(before);
    const excluded = request();
    expect(await provider.resolve({ ...excluded, identity: { ...excluded.identity, scope: { kind: 'portfolio', facilityGuids: ['facility-a', 'facility-c'] } } }, new AbortController().signal)).toMatchObject({ state: 'unsupported', message: expect.stringContaining('Include every selected facility') });
    const recovered = request();
    expect((await provider.resolve({ ...recovered, identity: { ...recovered.identity, scope: { kind: 'portfolio', facilityGuids: ['facility-a', 'facility-b'] } } }, new AbortController().signal)).state).toBe('ready');
    expect(ControlledWorker.instances).toHaveLength(1);
  });
  it.each(['unassigned', 'deleted', 'category', 'basis', 'baseline', 'child-error', 'missing-bank', 'cycle', 'foreign-bank', 'duplicate'] as const)('blocks %s before a Worker is created', async scenario => {
    const { fixture, store, provider, request } = setup(), snapshot = structuredClone(fixture.snapshot);
    switch (scenario) {
      case 'unassigned': snapshot.facilities.push({ ...snapshot.facilities[0], guid: 'new-facility' }); break;
      case 'deleted': snapshot.facilities = snapshot.facilities.filter(item => item.guid !== 'facility-b'); break;
      case 'category': snapshot.facilityAnalyses[0].analysisCategory = 'water'; break;
      case 'basis': snapshot.facilityAnalyses[0].energyIsSource = true; break;
      case 'baseline': snapshot.facilityAnalyses[0].baselineYear = 2021; break;
      case 'child-error': snapshot.facilityAnalyses[0].groups[0].analysisType = 'regression'; break;
      case 'missing-bank': snapshot.facilityAnalyses[0].hasBanking = true; snapshot.facilityAnalyses[0].bankedAnalysisItemId = 'missing'; break;
      case 'cycle': snapshot.facilityAnalyses[0].hasBanking = true; snapshot.facilityAnalyses[0].bankedAnalysisItemId = 'analysis-a'; break;
      case 'foreign-bank': snapshot.facilityAnalyses[0].hasBanking = true; snapshot.facilityAnalyses[0].bankedAnalysisItemId = 'analysis-b'; break;
      case 'duplicate': snapshot.accountAnalyses[0].facilityAnalysisItems.push(snapshot.accountAnalyses[0].facilityAnalysisItems[0]); break;
    }
    store.publishCommitted(snapshot, {});
    expect((await provider.resolve(request(), new AbortController().signal)).state).toBe('invalid-analysis');
    expect(ControlledWorker.instances).toHaveLength(0);
  });
  it('returns empty for all explicit skips and rejects account group/banked targets without calculating', async () => {
    const { fixture, store, provider, request } = setup();
    store.publishCommitted({ ...fixture.snapshot, accountAnalyses: [{ ...fixture.analysis, facilityAnalysisItems: fixture.analysis.facilityAnalysisItems.map(link => ({ ...link, analysisItemId: 'skip' })) }] }, {});
    expect((await provider.resolve(request(), new AbortController().signal)).state).toBe('empty');
    expect((await provider.resolve(request(accountAnalysisDefinition('banked-savings')), new AbortController().signal)).state).toBe('unsupported');
    const group = request();
    expect((await provider.resolve({ ...group, source: { ...accountAnalysisDefinition().sources[0] as AnalysisResultVisualizationSource, groupGuid: 'group-a' } }, new AbortController().signal)).state).toBe('unsupported');
    expect(ControlledWorker.instances).toHaveLength(0);
  });
  it('supports new-facility baseline exceptions and differing fiscal calendars', async () => {
    const { fixture, store, provider, request } = setup(), snapshot = structuredClone(fixture.snapshot);
    snapshot.facilities[0].isNewFacility = true; snapshot.facilityAnalyses[0].baselineYear = 2021;
    snapshot.account.fiscalYear = 'nonCalendarYear'; snapshot.account.fiscalYearMonth = 6; snapshot.account.fiscalYearCalendarEnd = true;
    store.publishCommitted(snapshot, {});
    const pending = provider.resolve(request(), new AbortController().signal), first = await worker(0); first.emit();
    expect((await pending).state).toBe('ready');
  });
  it('keeps selected input warnings calculable and invalidates changed banking dependencies', async () => {
    const { fixture, store, provider, request } = setup(), snapshot = structuredClone(fixture.snapshot);
    snapshot.meters[0].name = '';
    expect(evaluateWorkspaceStatus({ snapshot, calendarizedMeters: fixture.meters, revision: store.revision(), asOfDate: new Date() }).findings)
      .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'account-analysis.children.warning' })]));
    store.publishCommitted(snapshot, {});
    const warned = provider.resolve(request(), new AbortController().signal), first = await worker(0); first.emit(); expect((await warned).state).toBe('ready');
    const banked = { ...snapshot.facilityAnalyses[0], guid: 'banked-source' };
    snapshot.facilityAnalyses[0] = { ...snapshot.facilityAnalyses[0], hasBanking: true, bankedAnalysisItemId: banked.guid };
    snapshot.facilityAnalyses.push(banked); store.publishCommitted(snapshot, {});
    const changed = provider.resolve(request(), new AbortController().signal), second = await worker(1);
    expect(second.payload.allAccountAnalysisItems.map(item => item.guid)).toContain('banked-source'); second.emit(); expect((await changed).state).toBe('ready');
    store.publishCommitted({ ...snapshot, facilityAnalyses: snapshot.facilityAnalyses.map(item => item.guid === 'banked-source' ? { ...item, energyUnit: 'MMBtu' } : item) }, {});
    const edited = provider.resolve(request(), new AbortController().signal), third = await worker(2); third.emit(); expect((await edited).state).toBe('ready');
  });
  it('rejects wrong/summary responses, cancels late work and invalidates selected input changes', async () => {
    const { fixture, store, provider, request } = setup();
    const bad = provider.resolve(request(), new AbortController().signal), first = await worker(0);
    first.emit({ ok: true, value: { itemId: 'other' } }); expect((await bad).state).toBe('error');
    const summary = provider.resolve(request(), new AbortController().signal), second = await worker(1);
    const { facilitySummaries: _, ...dashboard } = calculateAccountAnalysisResults(second.payload); second.emit({ ok: true, value: dashboard }); expect((await summary).state).toBe('error');
    const abort = new AbortController(), pending = provider.resolve(request(), abort.signal), third = await worker(2);
    abort.abort(); third.emit(); expect((await pending).state).toBe('error'); expect(third.terminate).toHaveBeenCalledOnce();
    const changed = provider.resolve(request(), new AbortController().signal), fourth = await worker(3);
    store.publishCommitted({ ...fixture.snapshot, accountAnalyses: [{ ...fixture.analysis, energyUnit: 'MMBtu' }] }, {}); fourth.emit();
    expect((await changed).state).toBe('error');
    const retried = provider.resolve(request(), new AbortController().signal), fifth = await worker(4); fifth.emit(); expect((await retried).state).toBe('ready');
    store.publishCommitted({ ...store.snapshot()!, meterData: store.meterData().map((row, i) => i ? row : { ...row, totalEnergyUse: 110 }) }, {});
    const edited = provider.resolve(request(), new AbortController().signal), sixth = await worker(5); sixth.emit(); expect((await edited).state).toBe('ready');
    store.beginLoad(true); expect((await provider.resolve(request(), new AbortController().signal)).state).toBe('error');
  });
  it('suppresses changes during calendarization and times out then retries a hung account Worker', async () => {
    const { fixture, store, acquire, provider, request } = setup();
    let release!: (value: Awaited<ReturnType<typeof acquire>>) => void;
    const base = await acquire(); acquire.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const stale = provider.resolve(request(), new AbortController().signal);
    store.publishCommitted({ ...fixture.snapshot, accountAnalyses: [{ ...fixture.analysis, energyUnit: 'MMBtu' }] }, {}); release(base);
    expect((await stale).state).toBe('error'); expect(ControlledWorker.instances).toHaveLength(0);
    vi.useFakeTimers();
    const pending = provider.resolve(request(), new AbortController().signal), first = await worker(0);
    await vi.advanceTimersByTimeAsync(120001); expect((await pending).state).toBe('error'); expect(first.terminate).toHaveBeenCalledOnce();
    const retry = provider.resolve(request(), new AbortController().signal), second = await worker(1); second.emit(); expect((await retry).state).toBe('ready');
  });
});
