/** Cancel queued work before it starts; an active job owns its slot until teardown finishes. */
export class CalculationQueue {
  private active = 0;
  private readonly waiting = new Set<() => void>();
  constructor(private readonly limit = 2) {}
  run<T>(signal: AbortSignal, calculate: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const cancel = () => { this.waiting.delete(start); signal.removeEventListener('abort', cancel); reject(new DOMException('Calculation canceled', 'AbortError')); };
      const start = () => {
        if (signal.aborted) { cancel(); return; }
        if (this.active >= this.limit) return;
        this.waiting.delete(start); signal.removeEventListener('abort', cancel); this.active++;
        Promise.resolve().then(calculate).then(resolve, reject).finally(() => {
          this.active--;
          for (const next of this.waiting) { if (this.active >= this.limit) break; next(); }
        });
      };
      if (signal.aborted) { cancel(); return; }
      this.waiting.add(start); signal.addEventListener('abort', cancel, { once: true }); start();
    });
  }
}
