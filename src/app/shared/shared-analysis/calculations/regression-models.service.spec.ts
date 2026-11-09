import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { RegressionModelsService } from './regression-models.service';

class FakeRegressionWorker {
  static instances: FakeRegressionWorker[] = [];
  static postFailure: Error | undefined;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  readonly terminate = vi.fn();
  readonly postMessage = vi.fn(() => {
    if (FakeRegressionWorker.postFailure) { throw FakeRegressionWorker.postFailure; }
  });
  constructor() { FakeRegressionWorker.instances.push(this); }
}

function result(modelId: string) {
  return { data: { error: false, generatedModels: [{ modelId }] } } as MessageEvent;
}

describe('RegressionModelsService worker ownership', () => {
  let service: RegressionModelsService;
  const group = { idbGroupId: 'group-a', predictorVariables: [] } as AnalysisGroup;
  const analysis = { guid: 'analysis-a', groups: [group] } as IdbAnalysisItem;
  const facility = { guid: 'facility-a' } as IdbFacility;
  const generate = () => service.generateModels(group, analysis, facility, [], [], [], 'AR6');

  beforeEach(() => {
    FakeRegressionWorker.instances = [];
    FakeRegressionWorker.postFailure = undefined;
    vi.stubGlobal('Worker', FakeRegressionWorker);
    TestBed.configureTestingModule({ providers: [
      RegressionModelsService, { provide: AccountWorkspaceQueryService, useValue: {} }
    ] });
    service = TestBed.inject(RegressionModelsService);
  });

  afterEach(() => {
    service.terminateCurrentWorker();
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('ignores a queued reply from the replaced worker without terminating or settling its replacement', async () => {
    const oldSettled = vi.fn();
    void generate().then(oldSettled, oldSettled);
    const oldWorker = FakeRegressionWorker.instances[0];
    const queuedReply = oldWorker.onmessage!;
    const current = generate();
    const currentWorker = FakeRegressionWorker.instances[1];
    queuedReply(result('old-model'));
    await Promise.resolve();
    expect(oldSettled).not.toHaveBeenCalled();
    expect(oldWorker.terminate).toHaveBeenCalledOnce();
    expect(currentWorker.terminate).not.toHaveBeenCalled();
    currentWorker.onmessage!(result('current-model'));
    expect(await current).toEqual([{ modelId: 'current-model' }]);
    expect(currentWorker.terminate).toHaveBeenCalledOnce();
  });

  it.each(['onerror', 'onmessageerror'] as const)('ignores a stale %s callback after starting another worker', async callback => {
    const oldSettled = vi.fn();
    void generate().then(oldSettled, oldSettled);
    const oldWorker = FakeRegressionWorker.instances[0];
    const queuedError = oldWorker[callback]!;
    const current = generate();
    const currentWorker = FakeRegressionWorker.instances[1];
    queuedError({} as ErrorEvent & MessageEvent);
    await Promise.resolve();
    expect(oldSettled).not.toHaveBeenCalled();
    expect(currentWorker.terminate).not.toHaveBeenCalled();
    currentWorker.onmessage!(result('current-model'));
    expect(await current).toEqual([{ modelId: 'current-model' }]);
  });

  it.each(['onerror', 'onmessageerror'] as const)('rejects and cleans up an owning %s failure', async callback => {
    const current = generate();
    const failed = expect(current).rejects.toThrow(/Worker.*error generating regression models/);
    const worker = FakeRegressionWorker.instances[0];
    worker[callback]!({} as ErrorEvent & MessageEvent);
    await failed;
    expect(worker.terminate).toHaveBeenCalledOnce();
    const next = generate();
    expect(worker.terminate).toHaveBeenCalledOnce();
    FakeRegressionWorker.instances[1].onmessage!(result('next-model'));
    expect(await next).toEqual([{ modelId: 'next-model' }]);
  });

  it('keeps the existing error-result contract and terminates only its owning worker', async () => {
    const current = generate();
    const failed = expect(current).rejects.toThrow('Worker error generating regression models');
    const worker = FakeRegressionWorker.instances[0];
    worker.onmessage!({ data: { error: true } } as MessageEvent);
    await failed;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('rejects a failed post and releases that worker before another request', async () => {
    const error = new Error('Cannot post regression inputs');
    FakeRegressionWorker.postFailure = error;
    await expect(generate()).rejects.toBe(error);
    const worker = FakeRegressionWorker.instances[0];
    expect(worker.terminate).toHaveBeenCalledOnce();
    FakeRegressionWorker.postFailure = undefined;
    const current = generate();
    expect(worker.terminate).toHaveBeenCalledOnce();
    FakeRegressionWorker.instances[1].onmessage!(result('current-model'));
    expect(await current).toEqual([{ modelId: 'current-model' }]);
  });
});
