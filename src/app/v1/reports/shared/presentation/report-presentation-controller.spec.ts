import { signal } from '@angular/core';
import { ReportPresentationController } from './report-presentation-controller';

describe('report presentation registration', () => {
  it('follows availability and ignores stale stage cleanup after registration is replaced', () => {
    const controller = new ReportPresentationController();
    const first = { available: signal(true), present: vi.fn() };
    const unregisterFirst = controller.register(first);
    controller.present(); expect(first.present).toHaveBeenCalledOnce();
    const second = { available: signal(false), present: vi.fn() };
    const unregisterSecond = controller.register(second);
    unregisterFirst(); controller.present();
    expect(controller.available()).toBe(false); expect(second.present).not.toHaveBeenCalled();
    second.available.set(true); controller.present(); expect(second.present).toHaveBeenCalledOnce();
    unregisterSecond(); expect(controller.available()).toBe(false);
  });
});
