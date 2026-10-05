import { firstValueFrom } from 'rxjs';
import { runWorker } from './run-worker';

describe('runWorker in Chromium', () => {
  it('exchanges a message with a native Web Worker', async () => {
    const payload = { input: 42 };
    const workerUrl = new URL('./testing/echo.worker', import.meta.url);
    const workerResponse = await fetch(workerUrl);
    expect(workerResponse.ok).toBe(true);

    const worker = new Worker(workerUrl, { type: 'module' });

    const response = await firstValueFrom(
      runWorker<{ echo: typeof payload }>(worker, payload)
    );

    expect(response).toEqual({ echo: payload });
  });

  it('propagates native worker errors and stops a cancelled native worker', async () => {
    const errorUrl = URL.createObjectURL(new Blob(['throw new Error("native worker failure")'], { type: 'text/javascript' }));
    const delayedUrl = URL.createObjectURL(new Blob([
      'self.onmessage = () => setTimeout(() => self.postMessage({ late: true }), 25)'
    ], { type: 'text/javascript' }));

    try {
      await expect(firstValueFrom(runWorker(new Worker(errorUrl), undefined))).rejects.toBeDefined();

      const next = vi.fn();
      const subscription = runWorker(new Worker(delayedUrl), { start: true }).subscribe({ next });
      subscription.unsubscribe();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(next).not.toHaveBeenCalled();
    } finally {
      URL.revokeObjectURL(errorUrl);
      URL.revokeObjectURL(delayedUrl);
    }
  });
});
