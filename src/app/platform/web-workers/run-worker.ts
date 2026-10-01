import { Observable } from 'rxjs';

/**
 * Wraps a Web Worker call as a single-emission Observable.
 *
 * The returned Observable:
 *  - posts `payload` to the worker immediately on subscription
 *  - emits the response message data and completes
 *  - terminates the worker on completion, error, or unsubscription
 *
 * Usage:
 *   const worker = new Worker(new URL('./my.worker', import.meta.url));
 *   runWorker<MyResult>(worker, payload).pipe(
 *     takeUntilDestroyed(this.destroyRef)
 *   ).subscribe({ next: result => ..., error: err => ... });
 */
export function runWorker<T>(worker: Worker, payload: unknown): Observable<T> {
    return new Observable<T>(subscriber => {
        worker.addEventListener('message', (e: MessageEvent<T>) => {
            subscriber.next(e.data);
            subscriber.complete();
        }, { once: true });

        worker.addEventListener('error', (err: ErrorEvent) => {
            subscriber.error(err);
        }, { once: true });

        worker.postMessage(payload);

        return () => worker.terminate();
    });
}
