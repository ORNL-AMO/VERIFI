import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityAnalysisDetailsResultsService } from './facility-analysis-details-results.service';

describe('FacilityAnalysisDetailsResultsService browser Worker lifecycle', () => {
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

  it('calculates only the opened analysis and its banking dependencies', async () => {
    const service = configure();

    service.open('analysis-a');
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(1);
    expect(service.state()).toEqual({ state: 'loading', analysisGuid: 'analysis-a', message: 'Calculating…' });
    const payload = FakeWorker.instances[0].payload as any;
    expect(payload.analysisItem.guid).toBe('analysis-a');
    expect(payload.accountAnalysisItems.map((item: IdbAnalysisItem) => item.guid)).toEqual(['analysis-a', 'analysis-b']);
    expect(payload.includeGroupSummaries).toBe(false);

    FakeWorker.instances[0].emitMessage(completeResponse('analysis-a'));
    await settleSignals();

    expect(service.state()).toMatchObject({
      state: 'ready', analysisGuid: 'analysis-a',
      summary: { annual: { value: 6.25 }, monthly: { value: 4.5 } }
    });
  });

  it('cancels stale work when the opened analysis changes or the slideout closes', async () => {
    const service = configure();

    service.open('analysis-a');
    await settleSignals();
    const first = FakeWorker.instances[0];
    service.open('analysis-b');
    await settleSignals();

    expect(first.terminate).toHaveBeenCalledOnce();
    expect(FakeWorker.instances).toHaveLength(2);
    expect(service.state()).toMatchObject({ state: 'loading', analysisGuid: 'analysis-b' });

    const second = FakeWorker.instances[1];
    service.close();
    await settleSignals();

    expect(second.terminate).toHaveBeenCalledOnce();
    expect(service.state()).toEqual({ state: 'idle' });
  });

  it('reuses a completed fingerprint when an unchanged analysis is reopened', async () => {
    const service = configure();
    service.open('analysis-a');
    await settleSignals();
    FakeWorker.instances[0].emitMessage(completeResponse('analysis-a'));
    await settleSignals();

    service.close();
    await settleSignals();
    service.open('analysis-a');
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(1);
    expect(service.state()).toMatchObject({ state: 'ready', analysisGuid: 'analysis-a' });
  });
});

function configure(): FacilityAnalysisDetailsResultsService {
  const analyses = signal([
    analysisFixture('analysis-a', 'analysis-b'),
    analysisFixture('analysis-b'),
    analysisFixture('analysis-c')
  ]);
  const empty = signal<any[]>([]);
  const base = { state: 'ready' as const, accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] };
  TestBed.configureTestingModule({ providers: [
    FacilityAnalysisDetailsResultsService,
    {
      provide: AccountWorkspaceStore,
      useValue: {
        isReady: signal(true), facilityAnalyses: analyses,
        facilities: signal([{ guid: 'facility-a', fiscalYear: 'calendarYear' }]),
        meters: empty, predictorData: empty, predictors: empty
      }
    },
    { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items: signal([]) } },
    {
      provide: WorkspaceCalendarizationService,
      useValue: {
        calendarizeBase: () => of(base), currentInputFingerprint: signal('base-a'),
        project: () => ({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] })
      }
    }
  ] });
  return TestBed.inject(FacilityAnalysisDetailsResultsService);
}

function analysisFixture(guid: string, bankedAnalysisItemId?: string): IdbAnalysisItem {
  return {
    guid, accountId: 'account-a', facilityId: 'facility-a', name: guid,
    analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal',
    groups: [], baselineYear: 2020, hasBanking: Boolean(bankedAnalysisItemId), bankedAnalysisItemId
  } as IdbAnalysisItem;
}

function completeResponse(itemId: string): unknown {
  return {
    ok: true,
    value: {
      itemId, reportYear: 2025,
      annualAnalysisSummaries: [{ year: 2025, totalSavingsPercentImprovement: 6.25 }],
      monthlyAnalysisSummaryData: [{
        date: new Date(2026, 0, 1), rolling12MonthImprovement: 4.5, missingValueWarning: false
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
