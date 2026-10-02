import { firstValueFrom } from 'rxjs';
import { RegressionValidationWorkerRequest } from '@platform/web-workers/regression-validation-worker.contract';
import { runRegressionModelValidation } from './regression-model-validation.service';

describe('regression model validation browser Worker lifecycle', () => {
  let originalWorker: typeof Worker;

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    FakeValidationWorker.instances = [];
    globalThis.Worker = FakeValidationWorker as unknown as typeof Worker;
  });

  afterEach(() => { globalThis.Worker = originalWorker; });

  it('posts the complete validation payload and terminates after a result', async () => {
    const payload = validationRequest();
    const result = firstValueFrom(runRegressionModelValidation(payload));
    const worker = FakeValidationWorker.instances[0];
    expect(worker.payload).toEqual(payload);

    const response = { ok: true, value: { reportYear: 2025, model: { modelId: 'candidate' }, monthly: [] } };
    worker.emitMessage(response);
    await expect(result).resolves.toEqual(response);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('terminates a superseded validation subscription', () => {
    const subscription = runRegressionModelValidation(validationRequest()).subscribe();
    const worker = FakeValidationWorker.instances[0];
    subscription.unsubscribe();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('sends candidate and selected-model comparison through one worker', async () => {
    const payload = validationRequest(true);
    const result = firstValueFrom(runRegressionModelValidation(payload));
    expect(FakeValidationWorker.instances).toHaveLength(1);
    expect(FakeValidationWorker.instances[0].payload).toEqual(payload);

    const response = {
      ok: true,
      value: {
        reportYear: 2025,
        model: { modelId: 'candidate' },
        monthly: [{ modeledEnergy: 10 }],
        comparison: { model: { modelId: 'selected' }, monthly: [{ modeledEnergy: 12 }] }
      }
    };
    FakeValidationWorker.instances[0].emitMessage(response);

    await expect(result).resolves.toEqual(response);
    expect(FakeValidationWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });
});

function validationRequest(withComparison = false): RegressionValidationWorkerRequest {
  return {
    source: 'generated',
    group: { idbGroupId: 'group-a' },
    model: { modelId: 'candidate' },
    comparison: withComparison
      ? { group: { idbGroupId: 'group-a' }, model: { modelId: 'selected' } }
      : undefined,
    analysisItem: { guid: 'analysis-a' },
    facility: { guid: 'facility-a' },
    meters: [],
    meterData: [],
    facilityPredictorData: [],
    accountPredictorEntries: [],
    accountAnalysisItems: [],
    assessmentReportVersion: 'AR6'
  } as unknown as RegressionValidationWorkerRequest;
}

class FakeValidationWorker {
  static instances: FakeValidationWorker[] = [];
  readonly listeners = new Map<string, Array<(event: MessageEvent | ErrorEvent) => void>>();
  readonly terminate = vi.fn();
  payload: unknown;

  constructor() { FakeValidationWorker.instances.push(this); }
  addEventListener(type: string, listener: (event: MessageEvent | ErrorEvent) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  postMessage(payload: unknown): void { this.payload = payload; }
  emitMessage(data: unknown): void {
    if (this.terminate.mock.calls.length > 0) return;
    for (const listener of this.listeners.get('message') ?? []) listener({ data } as MessageEvent);
  }
}
