import { CalculationQueue } from './calculation-queue';
describe('calculation queue', () => {
  it('limits active work and cancels queued demand without starting it', async () => {
    const queue = new CalculationQueue(2), abort = new AbortController();
    const releases: Array<() => void> = []; let active = 0, peak = 0;
    const run = () => queue.run(new AbortController().signal, () => new Promise<void>(resolve => { active++; peak = Math.max(peak, active); releases.push(() => { active--; resolve(); }); }));
    const a = run(), b = run(); await Promise.resolve();
    let started = false;
    const canceled = queue.run(abort.signal, async () => { started = true; });
    const rejection = expect(canceled).rejects.toMatchObject({name: 'AbortError'}); abort.abort(); await rejection;
    const c = run(); releases.shift()!(); await a; await Promise.resolve(); await Promise.resolve();
    releases.shift()!(); await b; await Promise.resolve(); await Promise.resolve();
    releases.shift()!(); await c;
    expect(started).toBe(false); expect(peak).toBe(2);
  });
});
