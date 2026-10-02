import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { JStatRegressionModel } from '@data/models/analysis';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';

describe('RegressionModelsService browser Worker lifecycle', () => {
  let originalWorker: typeof Worker;

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    FakeRegressionWorker.instances = [];
    globalThis.Worker = FakeRegressionWorker as unknown as typeof Worker;
    TestBed.configureTestingModule({ providers: [
      RegressionModelsService,
      { provide: AccountWorkspaceQueryService, useValue: { getFacilityPredictorData: () => [] } }
    ] });
  });

  afterEach(() => {
    globalThis.Worker = originalWorker;
    TestBed.resetTestingModule();
  });

  it('posts the unchanged generation contract and resolves a successful result', async () => {
    const service = TestBed.inject(RegressionModelsService);
    const promise = generate(service);
    const worker = FakeRegressionWorker.instances[0];

    expect(worker.payload).toMatchObject({
      group: { idbGroupId: 'group-a', analysisType: 'regression' },
      analysisItem: { guid: 'analysis-a' },
      facility: { guid: 'facility-a' },
      assessmentReportVersion: 'AR6'
    });

    const models = [{ modelId: 'model-a' }] as JStatRegressionModel[];
    worker.emit({ ok: true, generatedModels: models });
    await expect(promise).resolves.toEqual(models);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('rejects Worker errors and terminates the failed Worker', async () => {
    const service = TestBed.inject(RegressionModelsService);
    const promise = generate(service);
    const worker = FakeRegressionWorker.instances[0];
    worker.emit({ ok: false, message: 'Worker error generating regression models' });

    await expect(promise).rejects.toThrow('Worker error generating regression models');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('lets each caller own cancellation and settles the cancelled request', async () => {
    const service = TestBed.inject(RegressionModelsService);
    const controller = new AbortController();
    const cancelledPromise = generate(service, controller.signal);
    const first = FakeRegressionWorker.instances[0];
    const latestPromise = generate(service);
    const latest = FakeRegressionWorker.instances[1];

    controller.abort();
    expect(first.terminate).toHaveBeenCalledOnce();
    await expect(cancelledPromise).rejects.toMatchObject({ name: 'AbortError' });
    latest.emit({ ok: true, generatedModels: [{ modelId: 'latest' }] });

    await expect(latestPromise).resolves.toEqual([{ modelId: 'latest' }]);
    expect(latest.terminate).toHaveBeenCalledOnce();
  });
});

function generate(service: RegressionModelsService, signal?: AbortSignal): Promise<JStatRegressionModel[]> {
  return service.generateModels(
    { idbGroupId: 'group-a', analysisType: 'regression' } as any,
    { guid: 'analysis-a' } as any,
    { guid: 'facility-a' } as any,
    [], [], [], 'AR6', signal
  );
}

class FakeRegressionWorker {
  static instances: FakeRegressionWorker[] = [];
  private readonly listeners = new Map<string, Array<(event: MessageEvent | ErrorEvent) => void>>();
  readonly terminate = vi.fn();
  payload: unknown;

  constructor() { FakeRegressionWorker.instances.push(this); }
  addEventListener(type: string, listener: (event: MessageEvent | ErrorEvent) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  postMessage(payload: unknown): void { this.payload = payload; }
  emit(data: unknown): void {
    if (this.terminate.mock.calls.length === 0) {
      for (const listener of this.listeners.get('message') ?? []) listener({ data } as MessageEvent);
    }
  }
}
