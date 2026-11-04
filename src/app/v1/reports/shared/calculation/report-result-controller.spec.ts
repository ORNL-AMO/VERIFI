import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ReportResultController, ReportResultRequest } from './report-result-controller';

interface ResultView { readonly title: string; readonly total?: number; }
type Request = ReportResultRequest<ResultView, number>;

function ready(content = 'first', value = 4, title = 'Report'): Request {
  return { state: { key: content, state: 'ready', value: { title } }, calculation: { content, request: value } };
}
function setup(initial: Request = ready()) {
  TestBed.configureTestingModule({});
  const request = signal(initial);
  const execute = vi.fn(value => of(value * 2));
  const controller = TestBed.runInInjectionContext(() => new ReportResultController({
    request, execute, loadingMessage: 'Calculating report', waitingMessage: 'Checking report inputs',
    project: (view, total) => ({ ...view, total })
  }));
  return { request, execute, controller };
}
async function settle() {
  TestBed.tick();
  await TestBed.inject(ApplicationRef).whenStable();
  TestBed.tick();
}

describe('report result calculation lifecycle', () => {
  afterEach(() => TestBed.resetTestingModule());

  it.each(['idle', 'waiting', 'review-required', 'error'] as const)('preserves %s readiness without starting output work', async state => {
    const { controller, execute } = setup({ state: { key: state, state, message: 'Prepared by the report' } });
    await settle();
    expect(controller.state()).toMatchObject({ state, message: 'Prepared by the report' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('reuses its current calculation across stages while projecting current presentation values', async () => {
    const { controller, request, execute } = setup();
    await settle();
    expect(controller.state()).toMatchObject({ state: 'ready', value: { title: 'Report', total: 8 } });
    request.set({ state: { key: 'checks-stage', state: 'ready', value: { title: 'Checks' } } });
    await settle();
    expect(controller.state().value?.total).toBeUndefined();
    request.set(ready('first', 4, 'Renamed report'));
    await settle();
    expect(controller.state().value).toEqual({ title: 'Renamed report', total: 8 });
    expect(execute).toHaveBeenCalledOnce();
  });

  it('hides superseded values immediately, cancels obsolete work, and ignores its late response', async () => {
    const { controller, request, execute } = setup();
    await settle();
    const obsolete = new Subject<number>();
    execute.mockReturnValueOnce(obsolete);
    request.set(ready('second', 5));
    expect(controller.state().value).toBeUndefined();
    await settle();
    expect(controller.state().state).toBe('loading');
    expect(obsolete.observed).toBe(true);
    request.set(ready('third', 6));
    expect(controller.state().value).toBeUndefined();
    await settle();
    expect(obsolete.observed).toBe(false);
    expect(controller.state().value?.total).toBe(12);
    obsolete.next(100);
    expect(controller.state().value?.total).toBe(12);
  });

  it('keeps in-flight calculation work across presentation edits and projects the latest values on completion', async () => {
    const { controller, request, execute } = setup();
    const pending = new Subject<number>();
    execute.mockReturnValueOnce(pending);
    await settle();
    request.set(ready('first', 4, 'Updated while calculating'));
    await settle();
    expect(pending.observed).toBe(true);
    expect(execute).toHaveBeenCalledOnce();
    pending.next(8);
    expect(controller.state().value).toEqual({ title: 'Updated while calculating', total: 8 });
  });

  it('retains only one calculated result rather than accumulating report histories', async () => {
    const { request, execute } = setup();
    await settle();
    request.set(ready('second', 5));
    await settle();
    request.set(ready());
    await settle();
    expect(execute.mock.calls.map(([value]) => value)).toEqual([4, 5, 4]);
  });

  it('hides output synchronously when readiness or calculation content changes under the same source key', async () => {
    const { controller, request } = setup();
    await settle();
    request.set({ ...ready('first'), calculation: { content: 'changed-inputs', request: 5 } });
    expect(controller.state().value).toBeUndefined();
    await settle();
    expect(controller.state().value?.total).toBe(10);
    request.set({ state: { key: 'first', state: 'review-required', message: 'Review changed data' } });
    expect(controller.state().value).toBeUndefined();
    await settle();
    expect(controller.state()).toMatchObject({ state: 'review-required', message: 'Review changed data' });
  });

  it.each(['observable', 'synchronous'] as const)('exposes %s execution errors and retries the unchanged request', async failure => {
    const { controller, execute } = setup();
    if (failure === 'observable') execute.mockReturnValueOnce(throwError(() => new Error('Worker failed')));
    else execute.mockImplementationOnce(() => { throw new Error('Worker failed'); });
    await settle();
    expect(controller.state()).toMatchObject({ state: 'error', message: 'Worker failed' });
    controller.retry();
    expect(controller.state().value).toBeUndefined();
    await settle();
    expect(controller.state()).toMatchObject({ state: 'ready', value: { total: 8 } });
    expect(execute).toHaveBeenCalledTimes(2);
    controller.retry();
    expect(controller.state().value).toBeUndefined();
    await settle();
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it('releases in-flight work when its owning injection context is destroyed', async () => {
    const { execute } = setup();
    const pending = new Subject<number>();
    execute.mockReturnValueOnce(pending);
    await settle();
    expect(pending.observed).toBe(true);
    TestBed.resetTestingModule();
    expect(pending.observed).toBe(false);
  });
});
