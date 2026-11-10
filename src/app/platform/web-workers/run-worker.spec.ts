import { vi } from 'vitest';
import { runWorker } from './run-worker';

type WorkerListener = (event: MessageEvent | ErrorEvent) => void;

function createFakeWorker() {
  const listeners = new Map<string, WorkerListener>();
  const postMessage = vi.fn();
  const terminate = vi.fn();
  const worker = {
    addEventListener: vi.fn((type: string, listener: WorkerListener) => {
      listeners.set(type, listener);
    }),
    postMessage,
    terminate
  } as unknown as Worker;

  return { listeners, postMessage, terminate, worker };
}

describe('runWorker', () => {
  it('posts the payload, emits the response, completes, and terminates the worker', () => {
    const { listeners, postMessage, terminate, worker } = createFakeWorker();
    const payload = { input: 42 };
    const next = vi.fn();
    const complete = vi.fn();

    const subscription = runWorker<{ result: number }>(worker, payload).subscribe({
      next,
      complete
    });

    expect(postMessage).toHaveBeenCalledWith(payload);

    listeners.get('message')?.(new MessageEvent('message', {
      data: { result: 84 }
    }));

    expect(next).toHaveBeenCalledWith({ result: 84 });
    expect(complete).toHaveBeenCalledOnce();
    expect(subscription.closed).toBe(true);
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('propagates worker errors and terminates the worker', () => {
    const { listeners, terminate, worker } = createFakeWorker();
    const error = vi.fn();
    const workerError = new ErrorEvent('error', { message: 'worker failed' });

    runWorker(worker, undefined).subscribe({ error });
    listeners.get('error')?.(workerError);

    expect(error).toHaveBeenCalledWith(workerError);
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('propagates a synchronous postMessage failure and terminates exactly once', () => {
    const { postMessage, terminate, worker } = createFakeWorker();
    const failure = new DOMException('The payload cannot be cloned.', 'DataCloneError');
    postMessage.mockImplementationOnce(() => { throw failure; });
    const error = vi.fn();

    const subscription = runWorker(worker, { input: 42 }).subscribe({ error });

    expect(error).toHaveBeenCalledWith(failure);
    expect(subscription.closed).toBe(true);
    expect(terminate).toHaveBeenCalledOnce();
    subscription.unsubscribe();
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('rejects an unreadable worker message and terminates its worker', () => {
    const { listeners, terminate, worker } = createFakeWorker();
    const error = vi.fn();
    const subscription = runWorker(worker, undefined).subscribe({ error });
    listeners.get('messageerror')?.(new MessageEvent('messageerror'));
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Worker message could not be deserialized.' }));
    expect(subscription.closed).toBe(true);
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('terminates the worker when the subscription is cancelled', () => {
    const { terminate, worker } = createFakeWorker();

    const subscription = runWorker(worker, { input: 42 }).subscribe();
    subscription.unsubscribe();

    expect(terminate).toHaveBeenCalledOnce();
  });
});
