import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { vi } from 'vitest';
import { WorkspaceGeometry, WorkspaceLayoutService } from './workspace-layout.service';

const wide: WorkspaceGeometry = { width: 1800, rail: 74, rem: 16, viewport: 1800, supportOpen: true };

describe('workspace panel layout', () => {
  let storage: { retrieve: ReturnType<typeof vi.fn>; store: ReturnType<typeof vi.fn> };
  let layout: WorkspaceLayoutService;
  function create(stored: unknown = null): void {
    storage = { retrieve: vi.fn(() => stored), store: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: storage }] });
    layout = TestBed.inject(WorkspaceLayoutService);
    layout.updateGeometry(wide);
  }

  it('previews independently, cancels without a write, and commits once in rem', () => {
    create();
    layout.begin('navigation'); layout.preview('navigation', 330);
    expect(layout.widths()).toEqual({ navigation: 330, support: 352 });
    expect(layout.preferredWidths()).toEqual({ navigation: 17, support: 22 });
    layout.cancel();
    expect(layout.widths().navigation).toBe(272); expect(storage.store).not.toHaveBeenCalled();
    layout.begin('support'); layout.preview('support', 420); layout.preview('support', 440);
    layout.commit('support'); layout.commit('support');
    expect(storage.store).toHaveBeenCalledExactlyOnceWith('v1WorkspaceLayout', { version: 1, navigation: 17, support: 27.5 });
    expect(layout.widths()).toEqual({ navigation: 272, support: 440 });
    layout.begin('navigation'); layout.preview('navigation', 360); layout.cancel();
    expect(layout.widths()).toEqual({ navigation: 272, support: 440 });
  });

  it('clamps edits to panel limits and reserves the main content with the other panel fixed', () => {
    create();
    layout.setWidth('navigation', 220); layout.setWidth('support', 10000);
    expect(layout.widths()).toEqual({ navigation: 224, support: 576 });
    layout.updateGeometry({ ...wide, width: 1200, viewport: 1200 });
    const other = layout.widths().support;
    layout.setWidth('navigation', 10000);
    expect(layout.widths().support).toBe(other);
    expect(1200 - 74 - layout.widths().navigation - other).toBeCloseTo(384);
    expect(layout.navigationBounds().max).toBeCloseTo(layout.widths().navigation);
  });

  it('shrinks proportionally on window changes and restores remembered widths without writing', () => {
    create({ version: 1, navigation: 26, support: 36 });
    layout.updateGeometry({ ...wide, width: 1200, viewport: 1200 });
    const widths = layout.widths();
    expect((widths.navigation - 224) / (416 - 224)).toBeCloseTo((widths.support - 288) / (576 - 288));
    expect(widths.navigation + widths.support).toBeCloseTo(1200 - 74 - 384);
    layout.updateGeometry(wide);
    expect(layout.widths()).toEqual({ navigation: 416, support: 576 });
    expect(storage.store).not.toHaveBeenCalled();
  });

  it('snaps below half minimum, cancels a collapse preview, and retains the expanded preference on commit', () => {
    create({ version: 1, navigation: 20, support: 25 });
    layout.begin('navigation'); layout.preview('navigation', 112);
    expect(layout.widths().navigation).toBe(224);
    layout.preview('navigation', 111); expect(layout.widths().navigation).toBe(0);
    layout.cancel(); expect(layout.widths().navigation).toBe(320);
    expect(layout.setWidth('navigation', 111)).toBe(true);
    expect(layout.widths().navigation).toBe(0);
    expect(layout.preferredWidths().navigation).toBe(20); expect(storage.store).not.toHaveBeenCalled();
    layout.updateGeometry({ ...wide, width: 1300, viewport: 1300 });
    expect(layout.widths().navigation).toBe(0);
    layout.updateGeometry({ ...wide, width: 800, viewport: 800 });
    expect(layout.widths().navigation).toBe(320);
    layout.updateGeometry(wide); expect(layout.widths().navigation).toBe(0);
    layout.setWidth('navigation', layout.navigationBounds().reopenWidth);
    expect(layout.widths().navigation).toBe(320);
    layout.begin('support'); layout.preview('support', 144); expect(layout.widths().support).toBe(288);
    layout.preview('support', 143); expect(layout.commit('support')).toBe(true);
    expect(layout.preferredWidths().support).toBe(25);
    layout.setSupportOpen(false); layout.setSupportOpen(true);
    expect(layout.widths().support).toBe(400);
  });

  it('reset reopens navigation and releases its space for the other panel when collapsed', () => {
    create(); layout.setWidth('navigation', 0);
    expect(layout.navigationBounds().min).toBe(0);
    expect(layout.supportBounds().max).toBe(576);
    layout.reset('navigation'); expect(layout.widths().navigation).toBe(272);
  });

  it('cancels previews on geometry changes and restores widths after closing and reopening support', () => {
    create({ version: 1, navigation: 26, support: 36 });
    layout.begin('support'); layout.preview('support', 450);
    layout.updateGeometry({ ...wide, width: 1000, viewport: 1000 });
    expect(layout.resizing()).toBe(false); expect(layout.supportBounds().enabled).toBe(false);
    expect(layout.navigationBounds().enabled).toBe(true);
    layout.begin('support'); layout.preview('support', 300); layout.commit('support');
    expect(storage.store).not.toHaveBeenCalled();
    layout.updateGeometry({ ...wide, width: 800, viewport: 800 });
    expect(layout.navigationBounds().enabled).toBe(false);
    layout.updateGeometry(wide); layout.setSupportOpen(false); layout.setSupportOpen(true);
    expect(layout.widths()).toEqual({ navigation: 416, support: 576 });
  });

  it('resets one preference even when there is insufficient space to display its default', () => {
    create({ version: 1, navigation: 26, support: 36 });
    layout.updateGeometry({ ...wide, width: 1170, viewport: 1170 });
    layout.reset('support');
    expect(layout.preferredWidths()).toEqual({ navigation: 26, support: 22 });
    layout.updateGeometry(wide);
    expect(layout.widths()).toEqual({ navigation: 416, support: 352 });
  });

  it.each([null, 'invalid', { version: 2, navigation: 20 }, { version: 1, navigation: NaN, support: '30' }])('defaults invalid preferences: %j', stored => {
    create(stored); expect(layout.preferredWidths()).toEqual({ navigation: 17, support: 22 });
  });

  it('clamps finite stored values, tolerates storage failures and ignores nonfinite input', () => {
    create({ version: 1, navigation: 100, support: -20 });
    expect(layout.preferredWidths()).toEqual({ navigation: 26, support: 18 });
    storage.store.mockImplementation(() => { throw Error('unavailable'); });
    layout.setWidth('navigation', 320);
    expect(layout.preferredWidths().navigation).toBe(20);
    layout.begin('navigation'); layout.preview('navigation', Infinity); layout.cancel();
    expect(layout.widths().navigation).toBe(320);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: { retrieve: () => { throw Error('unavailable'); } } }] });
    expect(TestBed.inject(WorkspaceLayoutService).preferredWidths()).toEqual({ navigation: 17, support: 22 });
  });

  it('keeps bounds ordered when enlarged text leaves less space than both minimum widths', () => {
    create(); layout.updateGeometry({ ...wide, width: 1170, viewport: 1170, rem: 40 });
    expect(layout.widths().navigation + layout.widths().support + 74).toBeCloseTo(1170);
    expect(layout.navigationBounds().max).toBeGreaterThanOrEqual(layout.navigationBounds().min);
    expect(layout.supportBounds().max).toBeGreaterThanOrEqual(layout.supportBounds().min);
  });
});
