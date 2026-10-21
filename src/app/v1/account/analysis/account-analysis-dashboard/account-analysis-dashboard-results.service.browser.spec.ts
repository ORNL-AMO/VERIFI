import { computed, effect, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { CALCULATION_WORKER_TIMEOUT_MS } from '@platform/web-workers/run-worker';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { of } from 'rxjs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { buildFacilityAnalysisCards } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis.models';
import { buildAccountAnalysisCards } from './account-analysis.models';
import { AnalysisInventoryEntry } from './analysis-inventory.models';
import { AccountAnalysisDashboardResultsService } from './account-analysis-dashboard-results.service';

describe('AccountAnalysisDashboardResultsService browser Worker lifecycle', () => {
  let originalWorker: typeof Worker;

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    FakeWorker.instances = [];
    FakeWorker.peakActive = 0;
    globalThis.Worker = FakeWorker as unknown as typeof Worker;
  });

  afterEach(() => {
    globalThis.Worker = originalWorker;
    TestBed.resetTestingModule();
  });

  it('limits concurrency, skips blocked analyses, and isolates per-card failures', async () => {
    const analyses = signal([
      accountAnalysisFixture('analysis-a'),
      accountAnalysisFixture('analysis-b'),
      accountAnalysisFixture('analysis-c'),
      accountAnalysisFixture('analysis-blocked')
    ]);
    configure(analyses, signal([{
      severity: 'error', entity: { kind: 'account-analysis', guid: 'analysis-blocked' }
    }]));

    const service = TestBed.inject(AccountAnalysisDashboardResultsService);
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(2);
    expect(FakeWorker.instances.every(worker => (worker.payload as any).calculateAllMonthlyData === true)).toBe(true);
    expect(service.states()['account:analysis-blocked']).toEqual({ state: 'blocked', message: 'Setup incomplete' });

    FakeWorker.instances[0].emitMessage(completeResponse('analysis-a', 2025, 6.25));
    await settleSignals();
    expect(FakeWorker.instances).toHaveLength(3);
    expect(FakeWorker.peakActive).toBe(2);
    expect(service.states()['account:analysis-a']).toMatchObject({
      state: 'ready',
      annualAnalysisSummaries: [
        { year: 2024, totalSavingsPercentImprovement: 3.25 },
        { year: 2025, totalSavingsPercentImprovement: 6.25 }
      ],
      summary: { annual: { value: 6.25 }, monthly: { value: 4.5 } }
    });

    FakeWorker.instances[1].emitMessage({ ok: false, message: 'failed' });
    await settleSignals();
    expect(service.states()['account:analysis-b']).toEqual({ state: 'error', message: 'Calculation failed' });
    expect(service.states()['account:analysis-c'].state).toBe('loading');
  });

  it('calculates warning-state analyses because warnings do not block results', async () => {
    const analyses = signal([accountAnalysisFixture('analysis-warning')]);
    configure(analyses, signal([{
      severity: 'warning', entity: { kind: 'account-analysis', guid: 'analysis-warning' }
    }]));

    const service = TestBed.inject(AccountAnalysisDashboardResultsService);
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(1);
    expect(service.states()['account:analysis-warning']).toEqual({ state: 'loading', message: 'Calculating…' });
  });

  it('blocks analyses with missing current-facility selections before starting a Worker', async () => {
    const analyses = signal([{ ...accountAnalysisFixture('analysis-missing'), facilityAnalysisItems: [] }]);
    configure(analyses, signal([]));

    const service = TestBed.inject(AccountAnalysisDashboardResultsService);
    await settleSignals();

    expect(service.states()['account:analysis-missing']).toEqual({ state: 'blocked', message: 'Setup incomplete' });
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it('cancels stale work, starts a replacement, and rejects stale messages when inputs change', async () => {
    const analyses = signal([accountAnalysisFixture('analysis-a')]);
    configure(analyses, signal([]));
    const service = TestBed.inject(AccountAnalysisDashboardResultsService);
    await settleSignals();
    const first = FakeWorker.instances[0];

    analyses.set([{ ...analyses()[0], baselineYear: 2021 }]);
    await settleSignals();

    expect(first.terminate).toHaveBeenCalledOnce();
    expect(FakeWorker.instances).toHaveLength(2);
    first.emitMessage(completeResponse('analysis-a', 2024, 1));
    expect(service.states()['account:analysis-a'].state).toBe('loading');
  });

  it('does not replace active work when analyses are only reordered', async () => {
    const firstAnalysis = accountAnalysisFixture('analysis-a');
    const secondAnalysis = accountAnalysisFixture('analysis-b');
    const analyses = signal([firstAnalysis, secondAnalysis]);
    configure(analyses, signal([]));
    TestBed.inject(AccountAnalysisDashboardResultsService);
    await settleSignals();
    const workers = [...FakeWorker.instances];

    analyses.set([secondAnalysis, firstAnalysis]);
    await settleSignals();

    expect(FakeWorker.instances).toEqual(workers);
    expect(workers.every(worker => worker.terminate.mock.calls.length === 0)).toBe(true);
  });

  it('keeps a card Worker running as mixed-scope comparison demand opens, changes, and closes', async () => {
    const { snapshot, service } = configure(signal([accountAnalysisFixture('analysis-a'), accountAnalysisFixture('analysis-b')]), signal([]), false);
    const current = snapshot();
    const cards = buildAccountAnalysisCards({ account: current.account, analyses: current.accountAnalyses, facilities: current.facilities, facilityAnalyses: current.facilityAnalyses, reports: [], statusItems: [], statusState: 'ready' });
    const facilityCards = buildFacilityAnalysisCards({ facility: current.facilities[0], analyses: current.facilityAnalyses, accountAnalyses: current.accountAnalyses, reports: [], meterGroups: [], statusItems: [], statusState: 'ready' });
    const card: AnalysisInventoryEntry = { scope: 'account', key: 'account:analysis-a', ownerName: 'Account A', card: cards[0] };
    const comparisons: AnalysisInventoryEntry[] = facilityCards.map(card => ({ scope: 'facility', key: `facility:${card.analysis.guid}`, ownerName: 'Facility A', facility: current.facilities[0], card }));
    service.setDemand([card]); await settleSignals();
    const retained = FakeWorker.instances[0];
    service.setDemand([card, ...comparisons]); await settleSignals();
    expect(FakeWorker.instances).toHaveLength(2);
    expect(retained.terminate).not.toHaveBeenCalled();
    const obsolete = FakeWorker.instances[1];
    service.setDemand([card, comparisons[1]]); await settleSignals();
    expect(obsolete.terminate).toHaveBeenCalledOnce();
    expect(FakeWorker.instances).toHaveLength(3);
    expect(retained.terminate).not.toHaveBeenCalled();
    expect(FakeWorker.instances.filter(worker => !worker.terminate.mock.calls.length)).toHaveLength(2);
    service.setDemand([card]); await settleSignals();
    expect(FakeWorker.instances[2].terminate).toHaveBeenCalledOnce();
    expect(retained.terminate).not.toHaveBeenCalled();
    expect(FakeWorker.instances).toHaveLength(3);
    retained.emitMessage(completeResponse('analysis-a', 2025, 6.25)); await settleSignals();
    expect(service.states()).toMatchObject({ 'account:analysis-a': { state: 'ready', summary: { annual: { value: 6.25 } } } });
    expect(Object.keys(service.states())).toEqual(['account:analysis-a']);
    expect(FakeWorker.peakActive).toBe(2);
  });

  it('replaces only the Worker whose input fingerprint changed', async () => {
    const analyses = signal([accountAnalysisFixture('analysis-a'), accountAnalysisFixture('analysis-b')]);
    configure(analyses, signal([]));
    const service = TestBed.inject(AccountAnalysisDashboardResultsService); await settleSignals();
    const [unchanged, obsolete] = FakeWorker.instances;
    analyses.set([analyses()[0], { ...analyses()[1], baselineYear: 2021 }]); await settleSignals();
    expect(unchanged.terminate).not.toHaveBeenCalled();
    expect(obsolete.terminate).toHaveBeenCalledOnce();
    expect(FakeWorker.instances).toHaveLength(3);
    expect((FakeWorker.instances[2].payload as any).accountAnalysisItem).toMatchObject({ guid: 'analysis-b', baselineYear: 2021 });
    obsolete.emitMessage(completeResponse('analysis-b', 2025, 99));
    expect(service.states()['account:analysis-b'].state).toBe('loading');
    unchanged.emitMessage(completeResponse('analysis-a', 2025, 6.25));
    FakeWorker.instances[2].emitMessage(completeResponse('analysis-b', 2025, 5)); await settleSignals();
    expect(service.states()['account:analysis-a']).toMatchObject({ state: 'ready', summary: { annual: { value: 6.25 } } });
    expect(service.states()['account:analysis-b']).toMatchObject({ state: 'ready', summary: { annual: { value: 5 } } });
  });

  it('cancels running and queued work when readiness is lost and terminates on destruction', async () => {
    const { ready, service } = configure(signal(['analysis-a', 'analysis-b', 'analysis-c'].map(accountAnalysisFixture)), signal([]));
    await settleSignals();
    expect(FakeWorker.instances).toHaveLength(2);
    ready.set(false); await settleSignals();
    expect(FakeWorker.instances).toHaveLength(2);
    expect(FakeWorker.instances.every(worker => worker.terminate.mock.calls.length === 1)).toBe(true);
    expect(Object.values(service.states()).every(state => state.state === 'loading' && state.message === 'Preparing data…')).toBe(true);
    ready.set(true); await settleSignals();
    expect(FakeWorker.instances).toHaveLength(4);
    TestBed.resetTestingModule();
    expect(FakeWorker.instances).toHaveLength(4);
    expect(FakeWorker.instances.every(worker => worker.terminate.mock.calls.length === 1)).toBe(true);
  });

  it('retains a completed card result when another analysis input changes', async () => {
    const firstAnalysis = accountAnalysisFixture('analysis-a');
    const secondAnalysis = accountAnalysisFixture('analysis-b');
    const analyses = signal([firstAnalysis, secondAnalysis]);
    configure(analyses, signal([]));
    const service = TestBed.inject(AccountAnalysisDashboardResultsService);
    await settleSignals();

    FakeWorker.instances[0].emitMessage(completeResponse('analysis-a', 2025, 6.25));
    await settleSignals();
    analyses.set([firstAnalysis, { ...secondAnalysis, baselineYear: 2021 }]);
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(3);
    expect(service.states()['account:analysis-a']).toMatchObject({
      state: 'ready', summary: { annual: { value: 6.25 } }
    });
  });

  it('times out stalled workers and continues queued calculations', async () => {
    vi.useFakeTimers();
    try {
      const analyses = signal([
        accountAnalysisFixture('analysis-a'),
        accountAnalysisFixture('analysis-b'),
        accountAnalysisFixture('analysis-c')
      ]);
      configure(analyses, signal([]));
      const service = TestBed.inject(AccountAnalysisDashboardResultsService);
      await settleSignals();

      expect(FakeWorker.instances).toHaveLength(2);
      await vi.advanceTimersByTimeAsync(CALCULATION_WORKER_TIMEOUT_MS);
      await settleSignals();

      expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
      expect(FakeWorker.instances[1].terminate).toHaveBeenCalledOnce();
      expect(FakeWorker.instances).toHaveLength(3);
      expect(service.states()['account:analysis-a']).toEqual({ state: 'error', message: 'Calculation failed' });
      expect(service.states()['account:analysis-b']).toEqual({ state: 'error', message: 'Calculation failed' });
      expect(service.states()['account:analysis-c']).toEqual({ state: 'loading', message: 'Calculating…' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('shares two Worker slots across scopes and projects the explicit facility without selection changes', async () => {
    const { snapshot, service } = configure(signal([accountAnalysisFixture('analysis-a'), accountAnalysisFixture('analysis-b')]), signal([]), false);
    const current = snapshot();
    const accountCards = buildAccountAnalysisCards({ account: current.account, analyses: current.accountAnalyses, facilities: current.facilities, facilityAnalyses: current.facilityAnalyses, reports: [], statusItems: [], statusState: 'ready' });
    const facilityCards = buildFacilityAnalysisCards({ facility: current.facilities[0], analyses: current.facilityAnalyses, accountAnalyses: current.accountAnalyses, reports: [], meterGroups: [], statusItems: [], statusState: 'ready' });
    const entries: AnalysisInventoryEntry[] = [
      { scope: 'account', key: 'account:analysis-a', ownerName: 'Account', card: accountCards[0] },
      ...facilityCards.map(card => ({ scope: 'facility' as const, key: `facility:${card.analysis.guid}`, ownerName: 'Facility', facility: current.facilities[0], card }))
    ];
    await settleSignals(); expect(FakeWorker.instances).toHaveLength(0);
    service.setDemand(entries); await settleSignals(); expect(FakeWorker.instances).toHaveLength(2);
    const payload = FakeWorker.instances[1].payload as any;
    expect(payload.facility.guid).toBe('facility-a'); expect(payload.analysisItem.facilityId).toBe('facility-a');
    expect(payload.includeGroupSummaries).toBe(false);
    FakeWorker.instances[0].emitMessage(completeResponse('analysis-a', 2025, 6)); await settleSignals();
    expect(FakeWorker.instances).toHaveLength(3);
    service.setDemand([]); await settleSignals(); expect(service.states()).toEqual({});
    expect(FakeWorker.instances[1].terminate).toHaveBeenCalledOnce();
    service.setDemand([entries[0]]); await settleSignals();
    expect(FakeWorker.instances).toHaveLength(3); expect(service.states()['account:analysis-a'].state).toBe('ready');
  });

  it('uses the deterministic synchronous fallback when Workers are unavailable', async () => {
    globalThis.Worker = undefined as unknown as typeof Worker;
    const analyses = signal(['analysis-a', 'analysis-b', 'analysis-c'].map(guid => ({
      ...accountAnalysisFixture(guid),
      facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'skip' }]
    })));
    configure(analyses, signal([]));

    const service = TestBed.inject(AccountAnalysisDashboardResultsService);
    await settleSignals();

    expect(Object.values(service.states()).map(state => state.state)).toEqual(['ready', 'ready', 'ready']);
    expect(FakeWorker.instances).toHaveLength(0);
  });
});

function configure(
  analyses: ReturnType<typeof signal<IdbAccountAnalysisItem[]>>,
  items: ReturnType<typeof signal<any[]>>, autoDemand = true
) {
  const ready = signal(true);
  const facilityAnalyses = computed<IdbAnalysisItem[]>(() => analyses().map(analysis => facilityAnalysisFixture(analysis.guid)));
  const snapshot = computed(() => ({
    account: {
      guid: 'account-a', name: 'Account A', fiscalYear: 'calendarYear', fiscalYearMonth: 0,
      fiscalYearCalendarEnd: true, assessmentReportVersion: 'AR6'
    },
    facilities: [{
      guid: 'facility-a', accountId: 'account-a', name: 'Facility A', fiscalYear: 'calendarYear',
      fiscalYearMonth: 0, fiscalYearCalendarEnd: true
    }],
    facilityAnalyses: facilityAnalyses(),
    accountAnalyses: analyses(),
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], accountReports: [],
    facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [],
    energyUseEquipment: []
  } as unknown as AccountWorkspaceSnapshot));
  TestBed.configureTestingModule({ providers: [
    AccountAnalysisDashboardResultsService,
    {
      provide: AccountWorkspaceStore,
      useValue: {
        account: computed(() => snapshot().account), accountAnalyses: analyses, snapshot, isReady: ready, status: signal('ready')
      }
    },
    { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items } },
    { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base', meters: [] }), currentInputFingerprint: () => 'base', project: () => ({ state: 'ready', meters: [] }) } }
  ] });
  const service = TestBed.inject(AccountAnalysisDashboardResultsService);
  if (autoDemand) TestBed.runInInjectionContext(() => effect(() => {
    const current = snapshot();
    const cards = buildAccountAnalysisCards({ account: current.account, analyses: analyses(), facilities: current.facilities, facilityAnalyses: current.facilityAnalyses, reports: [], statusItems: items(), statusState: 'ready' });
    service.setDemand(cards.map(card => ({ scope: 'account', key: `account:${card.analysis.guid}`, ownerName: 'Account A', card })));
  }));
  return { snapshot, service, ready };
}

function accountAnalysisFixture(guid: string): IdbAccountAnalysisItem {
  return {
    guid, accountId: 'account-a', name: guid, analysisCategory: 'energy', baselineYear: 2020,
    energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal',
    facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: `facility-${guid}` }]
  } as IdbAccountAnalysisItem;
}

function facilityAnalysisFixture(accountAnalysisGuid: string): IdbAnalysisItem {
  return {
    guid: `facility-${accountAnalysisGuid}`, accountId: 'account-a', facilityId: 'facility-a',
    name: `facility-${accountAnalysisGuid}`, analysisCategory: 'energy', energyIsSource: false,
    energyUnit: 'MMBtu', waterUnit: 'gal', groups: [], baselineYear: 2020, hasBanking: false
  } as IdbAnalysisItem;
}

function completeResponse(itemId: string, reportYear: number, annualImprovement: number): unknown {
  return {
    ok: true,
    value: {
      itemId, reportYear,
      annualAnalysisSummaries: [
        { year: reportYear - 1, totalSavingsPercentImprovement: 3.25 },
        { year: reportYear, totalSavingsPercentImprovement: annualImprovement }
      ],
      monthlyAnalysisSummaryData: [{
        date: new Date(reportYear + 1, 0, 1), rolling12MonthImprovement: 4.5,
        missingValueWarning: false
      }]
    }
  };
}

async function settleSignals(): Promise<void> {
  TestBed.flushEffects();
  await Promise.resolve();
  TestBed.flushEffects();
}

class FakeWorker {
  static instances: FakeWorker[] = [];
  static peakActive = 0;
  readonly listeners = new Map<string, Array<(event: MessageEvent | ErrorEvent) => void>>();
  readonly terminate = vi.fn();
  payload: unknown;

  constructor() {
    FakeWorker.instances.push(this);
    FakeWorker.peakActive = Math.max(FakeWorker.peakActive, FakeWorker.instances.filter(worker => !worker.terminate.mock.calls.length).length);
  }
  addEventListener(type: string, listener: (event: MessageEvent | ErrorEvent) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  postMessage(payload: unknown): void { this.payload = payload; }
  emitMessage(data: unknown): void {
    if (this.terminate.mock.calls.length > 0) return;
    for (const listener of this.listeners.get('message') ?? []) listener({ data } as MessageEvent);
  }
}
