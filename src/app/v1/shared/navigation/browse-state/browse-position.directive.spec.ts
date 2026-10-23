import { ApplicationRef, Component, afterNextRender } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BrowsePositionDirective } from './browse-position.directive';
import { BrowseKey, BrowseStateService } from './browse-state.service';

@Component({ standalone: true,
  hostDirectives: [{ directive: BrowsePositionDirective, inputs: ['appBrowsePosition', 'browsePositionReady', 'browseVisibleIds', 'browseRestoreStickyGap', 'browseSticky'] }],
  template: '<h1 tabindex="-1">Inventory</h1><button data-browse-id="meter-a">Meter A</button>' })
class BrowseHost { }

describe('render-based browse restoration', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [BrowseHost], providers: [provideRouter([])] });
    const store = TestBed.inject(BrowseStateService);
    const key: BrowseKey = { kind: 'meters', accountGuid: 'a' };
    store.savePosition(key, { scrollTop: 80, focusId: 'deleted-meter' });
    const read = vi.spyOn(store, 'readPosition');
    const fixture = TestBed.createComponent(BrowseHost);
    const root = document.createElement('main'); root.style.overflowY = 'auto';
    document.body.append(root); root.append(fixture.nativeElement);
    fixture.componentRef.setInput('appBrowsePosition', key);
    fixture.componentRef.setInput('browsePositionReady', true);
    const settle = async () => { fixture.detectChanges(); await TestBed.inject(ApplicationRef).whenStable(); };
    return { fixture, store, read, root, key, settle };
  }

  it('rechecks readiness at the render boundary and restores only once after it becomes ready again', async () => {
    const { fixture, read, root, settle } = setup();
    try {
      // Change the directive input after rendering, before its mixedReadWrite callback.
      TestBed.runInInjectionContext(() => afterNextRender({ earlyRead: () => fixture.componentRef.setInput('browsePositionReady', false) }));
      await settle();
      expect(read).not.toHaveBeenCalled(); expect(root.scrollTop).toBe(0);
      const focus = vi.spyOn(root.querySelector('h1')!, 'focus');
      fixture.componentRef.setInput('browsePositionReady', true); await settle();
      expect(root.scrollTop).toBe(80); expect(focus).toHaveBeenCalledOnce();
      fixture.componentRef.setInput('browseVisibleIds', ['meter-a']); await settle();
      fixture.componentRef.setInput('browseVisibleIds', []); await settle();
      expect(read).toHaveBeenCalledOnce();
    } finally { fixture.destroy(); root.remove(); }
  });

  it('ignores an obsolete account callback without overwriting its saved position', async () => {
    const { fixture, store, key, read, root, settle } = setup();
    const other: BrowseKey = { kind: 'meters', accountGuid: 'b' };
    store.savePosition(other, { scrollTop: 25 });
    try {
      TestBed.runInInjectionContext(() => afterNextRender({ earlyRead: () => fixture.componentRef.setInput('appBrowsePosition', other) }));
      await settle();
      expect(read).toHaveBeenCalledExactlyOnceWith(other); expect(root.scrollTop).toBe(25);
      expect(store.readPosition(key)).toEqual({ scrollTop: 80, focusId: 'deleted-meter' });
    } finally { fixture.destroy(); root.remove(); }
  });

  it('cancels destruction before restoration and retains the saved return position', async () => {
    const { fixture, store, key, read, root, settle } = setup();
    try {
      TestBed.runInInjectionContext(() => afterNextRender({ earlyRead: () => fixture.destroy() }));
      await settle();
      expect(read).not.toHaveBeenCalled();
      expect(store.readPosition(key)).toEqual({ scrollTop: 80, focusId: 'deleted-meter' });
    } finally { fixture.destroy(); root.remove(); }
  });

  it('lets user scrolling cancel a queued sticky-header correction', async () => {
    const { fixture, root, settle } = setup();
    let notify = () => {};
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) { notify = () => callback([], this as unknown as ResizeObserver); }
      observe(): void {}
      disconnect(): void {}
    });
    const heading = root.querySelector('h1')!;
    vi.spyOn(heading, 'getBoundingClientRect').mockReturnValueOnce({ height: 20 } as DOMRect).mockReturnValue({ height: 8 } as DOMRect);
    fixture.componentRef.setInput('browseRestoreStickyGap', true);
    fixture.componentRef.setInput('browseSticky', heading);
    try {
      await settle();
      const frames = new Map<number, FrameRequestCallback>();
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => { frames.set(1, callback); return 1; });
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
      notify();
      expect(frames.size).toBe(1);
      root.scrollTop = 40;
      root.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
      for (const callback of frames.values()) callback(0);
      expect(root.scrollTop).toBe(40); expect(frames.size).toBe(0);
    } finally { fixture.destroy(); root.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); }
  });
});
