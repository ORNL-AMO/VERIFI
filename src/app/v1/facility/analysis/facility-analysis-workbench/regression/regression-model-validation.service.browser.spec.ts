import { firstValueFrom } from 'rxjs';
import { runRegressionModelValidation, runRegressionModelValidationPair } from './regression-model-validation.service';

describe('regression model validation browser Worker lifecycle', () => {
  let originalWorker: typeof Worker;

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    FakeValidationWorker.instances = [];
    globalThis.Worker = FakeValidationWorker as unknown as typeof Worker;
  });

  afterEach(() => { globalThis.Worker = originalWorker; });

  it('posts the existing monthly-group payload and terminates after a result', async () => {
    const payload = { selectedGroup: { idbGroupId: 'group-a' }, analysisItem: { guid: 'analysis-a' }, reportYear: 2025 };
    const result = firstValueFrom(runRegressionModelValidation(payload));
    const worker = FakeValidationWorker.instances[0];
    expect(worker.payload).toEqual(payload);

    worker.emitMessage({ error: false, monthlyAnalysisSummary: { monthlyAnalysisSummaryData: [] } });
    await expect(result).resolves.toEqual({ error: false, monthlyAnalysisSummary: { monthlyAnalysisSummaryData: [] } });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('terminates a superseded validation subscription', () => {
    const subscription = runRegressionModelValidation({ selectedGroup: {}, analysisItem: {} }).subscribe();
    const worker = FakeValidationWorker.instances[0];
    subscription.unsubscribe();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('calculates candidate and selected-model comparison series independently', async () => {
    const result = firstValueFrom(runRegressionModelValidationPair(
      { selectedGroup: { selectedModelId: 'candidate' } },
      { selectedGroup: { selectedModelId: 'selected' } }
    ));
    expect(FakeValidationWorker.instances).toHaveLength(2);
    expect(FakeValidationWorker.instances[0].payload).toEqual({ selectedGroup: { selectedModelId: 'candidate' } });
    expect(FakeValidationWorker.instances[1].payload).toEqual({ selectedGroup: { selectedModelId: 'selected' } });

    const candidateResponse = { error: false, monthlyAnalysisSummary: { monthlyAnalysisSummaryData: [{ modeledEnergy: 10 }] } };
    const selectedResponse = { error: false, monthlyAnalysisSummary: { monthlyAnalysisSummaryData: [{ modeledEnergy: 12 }] } };
    FakeValidationWorker.instances[0].emitMessage(candidateResponse);
    FakeValidationWorker.instances[1].emitMessage(selectedResponse);

    await expect(result).resolves.toEqual([candidateResponse, selectedResponse]);
    expect(FakeValidationWorker.instances[0].terminate).toHaveBeenCalledOnce();
    expect(FakeValidationWorker.instances[1].terminate).toHaveBeenCalledOnce();
  });
});

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
