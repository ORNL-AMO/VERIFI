import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { RegressionModelsService } from './regression-models.service';

class FakeRegressionWorker {
  static instances: FakeRegressionWorker[] = [];
  static postFailure: Error | undefined;
  readonly listeners = new Map<string, (event: MessageEvent | ErrorEvent) => void>();
  addEventListener(type: string, listener: (event: MessageEvent | ErrorEvent) => void): void { this.listeners.set(type, listener); }
  emit(type: string, event: MessageEvent | ErrorEvent): void { this.listeners.get(type)?.(event); }
  readonly terminate = vi.fn();
  readonly postMessage = vi.fn(() => {
    if (FakeRegressionWorker.postFailure) { throw FakeRegressionWorker.postFailure; }
  });
  constructor() { FakeRegressionWorker.instances.push(this); }
}

function result(modelId: string) {
  return { data: { ok: true, generatedModels: [{ modelId }] } } as MessageEvent;
}

describe('RegressionModelsService worker ownership', () => {
  let service: RegressionModelsService;
  const group = { idbGroupId: 'group-a', predictorVariables: [] } as AnalysisGroup;
  const analysis = { guid: 'analysis-a', groups: [group] } as IdbAnalysisItem;
  const facility = { guid: 'facility-a' } as IdbFacility;
  const controllers: AbortController[] = [];
  const generate = () => { const controller = new AbortController(); controllers.push(controller); return service.generateModels(group, analysis, facility, [], [], [], 'AR6', controller.signal); };

  beforeEach(() => {
    controllers.length = 0;
    FakeRegressionWorker.instances = [];
    FakeRegressionWorker.postFailure = undefined;
    vi.stubGlobal('Worker', FakeRegressionWorker);
    TestBed.configureTestingModule({ providers: [
      RegressionModelsService, { provide: AccountWorkspaceQueryService, useValue: {} }
    ] });
    service = TestBed.inject(RegressionModelsService);
  });

  afterEach(() => {
    controllers.forEach(controller => controller.abort());
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('settles a cancelled request and ignores its queued reply without disturbing another caller', async () => {
    const old = generate();
    const cancelled = expect(old).rejects.toMatchObject({ name: 'AbortError' });
    const oldWorker = FakeRegressionWorker.instances[0];
    const queuedReply = oldWorker.listeners.get('message')!;
    const current = generate();
    const currentWorker = FakeRegressionWorker.instances[1];
    controllers[0].abort();
    queuedReply(result('old-model'));
    await cancelled;
    expect(oldWorker.terminate).toHaveBeenCalledOnce();
    expect(currentWorker.terminate).not.toHaveBeenCalled();
    currentWorker.emit('message', result('current-model'));
    expect(await current).toEqual([{ modelId: 'current-model' }]);
    expect(currentWorker.terminate).toHaveBeenCalledOnce();
  });

  it.each(['error', 'messageerror'] as const)('ignores a stale %s callback after starting another worker', async callback => {
    const old = generate();
    const cancelled = expect(old).rejects.toMatchObject({ name: 'AbortError' });
    const oldWorker = FakeRegressionWorker.instances[0];
    const queuedError = oldWorker.listeners.get(callback)!;
    const current = generate();
    const currentWorker = FakeRegressionWorker.instances[1];
    controllers[0].abort();
    queuedError(new ErrorEvent('error', { message: 'Worker error generating regression models' }));
    await cancelled;
    expect(currentWorker.terminate).not.toHaveBeenCalled();
    currentWorker.emit('message', result('current-model'));
    expect(await current).toEqual([{ modelId: 'current-model' }]);
  });

  it.each(['error', 'messageerror'] as const)('rejects and cleans up an owning %s failure', async callback => {
    const current = generate();
    const failed = expect(current).rejects.toMatchObject({ message: callback === 'messageerror' ? 'Worker message could not be deserialized.' : 'Worker error generating regression models' });
    const worker = FakeRegressionWorker.instances[0];
    worker.emit(callback, new ErrorEvent('error', { message: 'Worker error generating regression models' }));
    await failed;
    expect(worker.terminate).toHaveBeenCalledOnce();
    const next = generate();
    expect(worker.terminate).toHaveBeenCalledOnce();
    FakeRegressionWorker.instances[1].emit('message', result('next-model'));
    expect(await next).toEqual([{ modelId: 'next-model' }]);
  });

  it('keeps the existing error-result contract and terminates only its owning worker', async () => {
    const current = generate();
    const failed = expect(current).rejects.toThrow('Worker error generating regression models');
    const worker = FakeRegressionWorker.instances[0];
    worker.emit('message', { data: { ok: false, message: 'Worker error generating regression models' } } as MessageEvent);
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
    FakeRegressionWorker.instances[1].emit('message', result('current-model'));
    expect(await current).toEqual([{ modelId: 'current-model' }]);
  });
});
