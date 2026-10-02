import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { of } from 'rxjs';
import { FacilityAnalysisWorkbenchContext } from '../../facility-analysis-workbench-context.service';
import { FacilityAnalysisAutosaveService } from '../../editing/facility-analysis-autosave.service';
import { FacilityAnalysisResultsService } from './facility-analysis-results.service';

describe('FacilityAnalysisResultsService browser Worker lifecycle', () => {
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

  it('ignores display-only changes and terminates a calculation when relevant inputs change', async () => {
    const analysis = signal(analysisFixture());
    const empty = signal<any[]>([]);
    const base = { state: 'ready' as const, accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] };
    TestBed.configureTestingModule({ providers: [
      FacilityAnalysisResultsService,
      { provide: FacilityAnalysisAutosaveService, useValue: { state: signal('saved') } },
      {
        provide: WorkspaceCalendarizationService,
        useValue: {
          calendarizeBase: () => of(base),
          currentInputFingerprint: signal('base-a'),
          project: () => ({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] })
        }
      },
      {
        provide: FacilityAnalysisWorkbenchContext,
        useValue: {
          analysis,
          facility: signal({
            guid: 'facility-a', fiscalYear: 'calendarYear', fiscalYearMonth: 0,
            fiscalYearCalendarEnd: true
          }),
          status: { state: signal('ready') },
          hasBlockingErrors: signal(false),
          workspace: {
            isReady: signal(true),
            facilityMeters: empty,
            predictorData: empty,
            predictors: empty,
            facilityAnalyses: signal([analysis()])
          }
        }
      }
    ] });
    const service = TestBed.inject(FacilityAnalysisResultsService);
    await settleSignals();
    expect(service.state().state).toBe('loading');
    const first = FakeWorker.instances[0];

    analysis.set({ ...analysis(), name: 'Renamed analysis', modifiedDate: new Date() });
    await settleSignals();
    expect(FakeWorker.instances).toHaveLength(1);
    expect(first.terminate).not.toHaveBeenCalled();

    analysis.set({ ...analysis(), baselineYear: 2021 });
    await settleSignals();
    expect(first.terminate).toHaveBeenCalledOnce();
    const second = FakeWorker.instances[1];

    first.emitMessage(completeResponse('analysis-a', 2024));
    expect(service.state().state).toBe('loading');
    second.emitMessage(completeResponse('analysis-a', 2025));
    expect(service.state()).toMatchObject({ state: 'ready', reportYear: 2025 });
    expect(second.terminate).toHaveBeenCalledOnce();
  });

  it('waits for stable autosave and status inputs before starting a Worker', async () => {
    const analysis = signal(analysisFixture());
    const autosaveState = signal<'dirty' | 'saved'>('dirty');
    const statusState = signal<'evaluating' | 'ready'>('evaluating');
    const empty = signal<any[]>([]);
    const base = { state: 'ready' as const, accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] };
    TestBed.configureTestingModule({ providers: [
      FacilityAnalysisResultsService,
      { provide: FacilityAnalysisAutosaveService, useValue: { state: autosaveState } },
      {
        provide: WorkspaceCalendarizationService,
        useValue: {
          calendarizeBase: () => of(base), currentInputFingerprint: signal('base-a'),
          project: () => ({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] })
        }
      },
      {
        provide: FacilityAnalysisWorkbenchContext,
        useValue: {
          analysis,
          facility: signal({ guid: 'facility-a', fiscalYear: 'calendarYear', fiscalYearMonth: 0, fiscalYearCalendarEnd: true }),
          status: { state: statusState }, hasBlockingErrors: signal(false),
          workspace: {
            isReady: signal(true), facilityMeters: empty, predictorData: empty,
            predictors: empty, facilityAnalyses: signal([analysis()])
          }
        }
      }
    ] });
    const service = TestBed.inject(FacilityAnalysisResultsService);
    await settleSignals();
    expect(service.state()).toMatchObject({ state: 'waiting', reason: 'autosave' });
    expect(FakeWorker.instances).toHaveLength(0);

    statusState.set('ready');
    await settleSignals();
    expect(FakeWorker.instances).toHaveLength(0);

    autosaveState.set('saved');
    await settleSignals();
    expect(service.state().state).toBe('loading');
    expect(FakeWorker.instances).toHaveLength(1);
  });
});

function analysisFixture(): IdbAnalysisItem {
  return {
    guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Analysis A',
    analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal',
    groups: [], baselineYear: 2020, hasBanking: false, bankedAnalysisItemId: undefined
  } as IdbAnalysisItem;
}

function completeResponse(itemId: string, reportYear: number): unknown {
  return {
    ok: true,
    value: {
      itemId, reportYear,
      annualAnalysisSummaries: [], monthlyAnalysisSummaryData: [], groupSummaries: []
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
