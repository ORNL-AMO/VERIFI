import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityAnalysisWorkbenchContext } from './facility-analysis-workbench-context.service';
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

  it('terminates superseded calculations and never publishes their stale result', async () => {
    const revision = signal(1);
    const analysis = signal({ guid: 'analysis-a', groups: [] } as IdbAnalysisItem);
    const empty = signal<any[]>([]);
    TestBed.configureTestingModule({ providers: [
      FacilityAnalysisResultsService,
      {
        provide: FacilityAnalysisWorkbenchContext,
        useValue: {
          analysis,
          facility: signal({ guid: 'facility-a' }),
          account: signal({ guid: 'account-a', assessmentReportVersion: 'AR6' }),
          hasBlockingErrors: signal(false),
          workspace: {
            revision,
            isReady: signal(true),
            facilityMeters: empty,
            facilityMeterData: empty,
            predictorData: empty,
            predictors: empty,
            facilityAnalyses: signal([analysis()]),
            customGWPs: empty
          }
        }
      }
    ] });
    const service = TestBed.inject(FacilityAnalysisResultsService);
    await settleSignals();
    expect(service.state().state).toBe('loading');
    const first = FakeWorker.instances[0];

    revision.set(2);
    await settleSignals();
    expect(first.terminate).toHaveBeenCalled();
    const second = FakeWorker.instances[1];

    first.emitMessage(completeResponse('analysis-a', 2024));
    expect(service.state().state).toBe('loading');
    second.emitMessage(completeResponse('analysis-a', 2025));
    expect(service.state()).toMatchObject({ state: 'ready', revision: 2, reportYear: 2025 });
    expect(second.terminate).toHaveBeenCalled();
  });
});

function completeResponse(itemId: string, reportYear: number): unknown {
  return {
    itemId, reportYear, error: false,
    annualAnalysisSummaries: [], monthlyAnalysisSummaryData: [], groupSummaries: []
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
