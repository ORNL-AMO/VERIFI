import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReportAnalysisInspectionController } from './report-analysis-inspection-controller';

function setup() {
  TestBed.configureTestingModule({});
  const key = signal('report-a'), canSelect = signal(true), entries = signal([{ id: 'first' }, { id: 'second' }]);
  const setDemand = vi.fn(), select = vi.fn(), flush = vi.fn(async () => true), navigate = vi.fn(async () => true);
  const controller = TestBed.runInInjectionContext(() => new ReportAnalysisInspectionController({
    key, canSelect, find: value => entries().find(entry => entry.id === value), setDemand, select, flush, navigate
  }));
  return { controller, key, canSelect, entries, setDemand, select, flush, navigate };
}

describe('report analysis inspection lifecycle', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('demands only the inspected eligible analysis and clears demand on close without selecting or saving', () => {
    const { controller, setDemand, select, flush } = setup();
    TestBed.tick();
    expect(setDemand).toHaveBeenLastCalledWith([]);
    controller.inspect('missing');
    expect(controller.entry()).toBeUndefined();
    controller.inspect('first');
    TestBed.tick();
    expect(setDemand).toHaveBeenLastCalledWith([{ id: 'first' }]);
    controller.inspect('second');
    TestBed.tick();
    expect(setDemand).toHaveBeenLastCalledWith([{ id: 'second' }]);
    controller.close();
    expect(controller.entry()).toBeUndefined();
    TestBed.tick();
    expect(setDemand).toHaveBeenLastCalledWith([]);
    expect(select).not.toHaveBeenCalled();
    expect(flush).not.toHaveBeenCalled();
  });

  it.each(['report-switch', 'analysis-removed'] as const)('hides inspection immediately on %s and cancels its demand', scenario => {
    const { controller, key, entries, setDemand } = setup();
    controller.inspect('first');
    TestBed.tick();
    if (scenario === 'report-switch') key.set('report-b');
    else entries.set([{ id: 'second' }]);
    expect(controller.entry()).toBeUndefined();
    TestBed.tick();
    expect(setDemand).toHaveBeenLastCalledWith([]);
  });

  it('selects through the adapter only when editing is allowed, then closes inspection', () => {
    const { controller, canSelect, select, flush } = setup();
    controller.inspect('second');
    canSelect.set(false);
    controller.select();
    expect(select).not.toHaveBeenCalled();
    expect(controller.entry()).toEqual({ id: 'second' });
    canSelect.set(true);
    controller.select();
    expect(select).toHaveBeenCalledWith('second', { id: 'second' });
    expect(controller.entry()).toBeUndefined();
    expect(flush).not.toHaveBeenCalled();
  });

  it('finishes saving before navigating and blocks duplicate navigation and selection while saving', async () => {
    const { controller, flush, navigate, select } = setup();
    let resolve!: (saved: boolean) => void;
    flush.mockImplementationOnce(() => new Promise<boolean>(done => { resolve = done; }));
    controller.inspect('first');
    const opening = controller.goToAnalysis();
    expect(controller.opening()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    await controller.goToAnalysis();
    controller.select();
    expect(flush).toHaveBeenCalledOnce();
    expect(select).not.toHaveBeenCalled();
    resolve(true);
    await opening;
    expect(navigate).toHaveBeenCalledWith({ id: 'first' });
    expect(controller.opening()).toBe(false);
  });

  it.each(['save-failed', 'report-switch', 'closed', 'another-inspection', 'destroyed'] as const)(
    'cancels deferred navigation after %s', async scenario => {
      const { controller, key, flush, navigate, setDemand } = setup();
      let resolve!: (saved: boolean) => void;
      flush.mockImplementationOnce(() => new Promise<boolean>(done => { resolve = done; }));
      controller.inspect('first');
      TestBed.tick();
      const opening = controller.goToAnalysis();
      if (scenario === 'report-switch') key.set('report-b');
      else if (scenario === 'closed') controller.close();
      else if (scenario === 'another-inspection') controller.inspect('second');
      else if (scenario === 'destroyed') {
        TestBed.resetTestingModule();
        expect(setDemand).toHaveBeenLastCalledWith([]);
      }
      resolve(scenario !== 'save-failed');
      await opening;
      expect(navigate).not.toHaveBeenCalled();
      expect(controller.opening()).toBe(false);
    });

  it('restores the loading control after a navigation failure without changing selection', async () => {
    const { controller, navigate, select } = setup();
    navigate.mockRejectedValueOnce(new Error('Navigation unavailable'));
    controller.inspect('first');
    await expect(controller.goToAnalysis()).rejects.toThrow('Navigation unavailable');
    expect(controller.opening()).toBe(false);
    expect(controller.entry()).toEqual({ id: 'first' });
    expect(select).not.toHaveBeenCalled();
  });
});
