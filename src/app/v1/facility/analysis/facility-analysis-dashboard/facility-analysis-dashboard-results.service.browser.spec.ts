import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { of } from 'rxjs';
import { FacilityAnalysisDashboardResultsService } from './facility-analysis-dashboard-results.service';

describe('FacilityAnalysisDashboardResultsService browser Worker lifecycle', () => {
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
      analysisFixture('analysis-a', 'analysis-b'),
      analysisFixture('analysis-b', 'analysis-c'),
      analysisFixture('analysis-c'),
      analysisFixture('analysis-blocked')
    ]);
    configure(analyses, signal([{
      severity: 'error', entity: { kind: 'facility-analysis', guid: 'analysis-blocked' }
    }]));

    const service = TestBed.inject(FacilityAnalysisDashboardResultsService);
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(2);
    expect(FakeWorker.instances.every(worker => (worker.payload as any).calculateAllMonthlyData === true)).toBe(true);
    expect(FakeWorker.instances.every(worker => (worker.payload as any).includeGroupSummaries === false)).toBe(true);
    expect((FakeWorker.instances[0].payload as any).accountAnalysisItems.map((item: IdbAnalysisItem) => item.guid))
      .toEqual(['analysis-a', 'analysis-b', 'analysis-c']);
    expect(service.states()['analysis-blocked']).toEqual({ state: 'blocked', message: 'Setup incomplete' });

    FakeWorker.instances[0].emitMessage(completeResponse('analysis-a', 2025, 6.25));
    await settleSignals();
    expect(FakeWorker.instances).toHaveLength(3);
    expect(service.states()['analysis-a']).toMatchObject({
      state: 'ready', summary: { annual: { value: 6.25 }, monthly: { value: 4.5 } }
    });

    FakeWorker.instances[1].emitMessage({ ok: false, message: 'failed' });
    await settleSignals();
    expect(service.states()['analysis-b']).toEqual({ state: 'error', message: 'Calculation failed' });
    expect(service.states()['analysis-c'].state).toBe('loading');
  });

  it('cancels stale work and starts a replacement when calculation inputs change', async () => {
    const analyses = signal([analysisFixture('analysis-a')]);
    configure(analyses, signal([]));
    const service = TestBed.inject(FacilityAnalysisDashboardResultsService);
    await settleSignals();
    const first = FakeWorker.instances[0];

    analyses.set([{ ...analyses()[0], baselineYear: 2021 }]);
    await settleSignals();

    expect(first.terminate).toHaveBeenCalledOnce();
    expect(FakeWorker.instances).toHaveLength(2);
    first.emitMessage(completeResponse('analysis-a', 2024, 1));
    expect(service.states()['analysis-a'].state).toBe('loading');
  });

  it('calculates warning-state analyses because warnings do not block results', async () => {
    const analyses = signal([analysisFixture('analysis-warning')]);
    configure(analyses, signal([{
      severity: 'warning', entity: { kind: 'facility-analysis', guid: 'analysis-warning' }
    }]));

    const service = TestBed.inject(FacilityAnalysisDashboardResultsService);
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(1);
    expect(service.states()['analysis-warning']).toEqual({ state: 'loading', message: 'Calculating…' });
  });

  it('does not replace active work when the analysis collection is only reordered', async () => {
    const firstAnalysis = analysisFixture('analysis-a');
    const secondAnalysis = analysisFixture('analysis-b');
    const analyses = signal([firstAnalysis, secondAnalysis]);
    configure(analyses, signal([]));
    TestBed.inject(FacilityAnalysisDashboardResultsService);
    await settleSignals();
    const workers = [...FakeWorker.instances];

    analyses.set([secondAnalysis, firstAnalysis]);
    await settleSignals();

    expect(FakeWorker.instances).toEqual(workers);
    expect(workers.every(worker => worker.terminate.mock.calls.length === 0)).toBe(true);
  });

  it('retains a completed card result when another analysis input changes', async () => {
    const firstAnalysis = analysisFixture('analysis-a');
    const secondAnalysis = analysisFixture('analysis-b');
    const analyses = signal([firstAnalysis, secondAnalysis]);
    configure(analyses, signal([]));
    const service = TestBed.inject(FacilityAnalysisDashboardResultsService);
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
});

function configure(analyses: ReturnType<typeof signal<IdbAnalysisItem[]>>, items: ReturnType<typeof signal<any[]>>): void {
  const empty = signal<any[]>([]);
  const facility = signal({
    guid: 'facility-a', fiscalYear: 'calendarYear', fiscalYearMonth: 0,
    fiscalYearCalendarEnd: true
  });
  const base = { state: 'ready' as const, accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] };
  TestBed.configureTestingModule({ providers: [
    FacilityAnalysisDashboardResultsService,
    {
      provide: AccountWorkspaceStore,
      useValue: {
        selectedFacilityAnalyses: analyses, selectedFacility: facility, isReady: signal(true), status: signal('ready'),
        facilityAnalyses: analyses, facilityMeters: empty, predictorData: empty, predictors: empty
      }
    },
    { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items } },
    {
      provide: WorkspaceCalendarizationService,
      useValue: {
        calendarizeBase: () => of(base), currentInputFingerprint: signal('base-a'),
        project: () => ({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] })
      }
    }
  ] });
}

function analysisFixture(guid: string, bankedAnalysisItemId?: string): IdbAnalysisItem {
  return {
    guid, accountId: 'account-a', facilityId: 'facility-a', name: guid,
    analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal',
    groups: [], baselineYear: 2020, hasBanking: Boolean(bankedAnalysisItemId), bankedAnalysisItemId
  } as IdbAnalysisItem;
}

function completeResponse(itemId: string, reportYear: number, annualImprovement: number): unknown {
  return {
    ok: true,
    value: {
      itemId, reportYear,
      annualAnalysisSummaries: [{ year: reportYear, totalSavingsPercentImprovement: annualImprovement }],
      monthlyAnalysisSummaryData: [{
        date: new Date(reportYear + 1, 0, 1), rolling12MonthImprovement: 4.5,
        missingValueWarning: false
      }],
      groupSummaries: []
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
