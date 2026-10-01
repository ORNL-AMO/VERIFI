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
    worker.emit({ error: false, generatedModels: models });
    await expect(promise).resolves.toEqual(models);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('rejects Worker errors and terminates the failed Worker', async () => {
    const service = TestBed.inject(RegressionModelsService);
    const promise = generate(service);
    const worker = FakeRegressionWorker.instances[0];
    worker.emit({ error: true });

    await expect(promise).rejects.toThrow('Worker error generating regression models');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('terminates a superseded Worker and accepts only the latest generation', async () => {
    const service = TestBed.inject(RegressionModelsService);
    void generate(service);
    const first = FakeRegressionWorker.instances[0];
    const latestPromise = generate(service);
    const latest = FakeRegressionWorker.instances[1];

    expect(first.terminate).toHaveBeenCalledOnce();
    first.emit({ error: false, generatedModels: [{ modelId: 'stale' }] });
    latest.emit({ error: false, generatedModels: [{ modelId: 'latest' }] });

    await expect(latestPromise).resolves.toEqual([{ modelId: 'latest' }]);
    expect(latest.terminate).toHaveBeenCalledOnce();
  });
});

function generate(service: RegressionModelsService): Promise<JStatRegressionModel[]> {
  return service.generateModels(
    { idbGroupId: 'group-a', analysisType: 'regression' } as any,
    { guid: 'analysis-a' } as any,
    { guid: 'facility-a' } as any,
    [], [], [], 'AR6'
  );
}

class FakeRegressionWorker {
  static instances: FakeRegressionWorker[] = [];
  onmessage?: (event: MessageEvent) => void;
  readonly terminate = vi.fn();
  payload: unknown;

  constructor() { FakeRegressionWorker.instances.push(this); }
  postMessage(payload: unknown): void { this.payload = payload; }
  emit(data: unknown): void {
    if (this.terminate.mock.calls.length === 0) this.onmessage?.({ data } as MessageEvent);
  }
}
