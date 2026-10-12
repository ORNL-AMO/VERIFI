import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { CALCULATION_WORKER_TIMEOUT_MS } from '@platform/web-workers/run-worker';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { AccountAnalysisDashboardResultsService } from './account-analysis-dashboard-results.service';

describe('AccountAnalysisDashboardResultsService browser Worker lifecycle', () => {
  let originalWorker: typeof Worker;

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    FakeWorker.instances = [];
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
    expect(service.states()['analysis-blocked']).toEqual({ state: 'blocked', message: 'Setup incomplete' });

    FakeWorker.instances[0].emitMessage(completeResponse('analysis-a', 2025, 6.25));
    await settleSignals();
    expect(FakeWorker.instances).toHaveLength(3);
    expect(service.states()['analysis-a']).toMatchObject({
      state: 'ready',
      annualAnalysisSummaries: [
        { year: 2024, totalSavingsPercentImprovement: 3.25 },
        { year: 2025, totalSavingsPercentImprovement: 6.25 }
      ],
      summary: { annual: { value: 6.25 }, monthly: { value: 4.5 } }
    });

    FakeWorker.instances[1].emitMessage({ ok: false, message: 'failed' });
    await settleSignals();
    expect(service.states()['analysis-b']).toEqual({ state: 'error', message: 'Calculation failed' });
    expect(service.states()['analysis-c'].state).toBe('loading');
  });

  it('calculates warning-state analyses because warnings do not block results', async () => {
    const analyses = signal([accountAnalysisFixture('analysis-warning')]);
    configure(analyses, signal([{
      severity: 'warning', entity: { kind: 'account-analysis', guid: 'analysis-warning' }
    }]));

    const service = TestBed.inject(AccountAnalysisDashboardResultsService);
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(1);
    expect(service.states()['analysis-warning']).toEqual({ state: 'loading', message: 'Calculating…' });
  });

  it('blocks analyses with missing current-facility selections before starting a Worker', async () => {
    const analyses = signal([{ ...accountAnalysisFixture('analysis-missing'), facilityAnalysisItems: [] }]);
    configure(analyses, signal([]));

    const service = TestBed.inject(AccountAnalysisDashboardResultsService);
    await settleSignals();

    expect(service.states()['analysis-missing']).toEqual({ state: 'blocked', message: 'Setup incomplete' });
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
    expect(service.states()['analysis-a'].state).toBe('loading');
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
    expect(service.states()['analysis-a']).toMatchObject({
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
      expect(service.states()['analysis-a']).toEqual({ state: 'error', message: 'Calculation failed' });
      expect(service.states()['analysis-b']).toEqual({ state: 'error', message: 'Calculation failed' });
      expect(service.states()['analysis-c']).toEqual({ state: 'loading', message: 'Calculating…' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the deterministic synchronous fallback when Workers are unavailable', async () => {
    globalThis.Worker = undefined as unknown as typeof Worker;
    const analyses = signal([{
      ...accountAnalysisFixture('analysis-a'),
      facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'skip' }]
    }]);
    configure(analyses, signal([]));

    const service = TestBed.inject(AccountAnalysisDashboardResultsService);
    await settleSignals();

    expect(service.states()['analysis-a'].state).toBe('ready');
    expect(FakeWorker.instances).toHaveLength(0);
  });
});

function configure(
  analyses: ReturnType<typeof signal<IdbAccountAnalysisItem[]>>,
  items: ReturnType<typeof signal<any[]>>
): void {
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
        accountAnalyses: analyses, snapshot, isReady: signal(true), status: signal('ready')
      }
    },
    { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items } }
  ] });
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
  readonly listeners = new Map<string, Array<(event: MessageEvent | ErrorEvent) => void>>();
  readonly terminate = vi.fn();
  payload: unknown;

  constructor() { FakeWorker.instances.push(this); }
  addEventListener(type: string, listener: (event: MessageEvent | ErrorEvent) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  postMessage(payload: unknown): void { this.payload = payload; }
  emitMessage(data: unknown): void {
    if (this.terminate.mock.calls.length > 0) return;
    for (const listener of this.listeners.get('message') ?? []) listener({ data } as MessageEvent);
  }
}
