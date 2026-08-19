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
});
