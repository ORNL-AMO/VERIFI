import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PanelResizeHandleComponent, PanelResizeIntent } from './panel-resize-handle.component';

describe('panel resize handle', () => {
  let fixture: ComponentFixture<PanelResizeHandleComponent>, host: HTMLElement;
  let intents: PanelResizeIntent[], captured: boolean, frame: FrameRequestCallback;
  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [PanelResizeHandleComponent] });
    fixture = TestBed.createComponent(PanelResizeHandleComponent);
    host = fixture.nativeElement;
    for (const [name, value] of Object.entries({ value: 300, min: 224, max: 416, label: 'Resize navigation', panelId: 'navigation', resizing: true })) fixture.componentRef.setInput(name, value);
    captured = false;
    host.setPointerCapture = vi.fn(() => { captured = true; });
    host.hasPointerCapture = vi.fn(() => captured);
    host.releasePointerCapture = vi.fn(() => { captured = false; });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 123; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    intents = []; fixture.componentInstance.resizeIntent.subscribe(intent => intents.push(intent));
    fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); vi.restoreAllMocks(); });
  function pointer(type: string, x: number, id = 1): void {
    host.dispatchEvent(Object.assign(new Event(type), { pointerId: id, clientX: x, button: 0, isPrimary: true }));
  }
  function key(value: string, shiftKey = false): void { host.dispatchEvent(new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true })); }

  it('exposes a named keyboard separator and emits physical divider movement on both sides', () => {
    expect(host.getAttribute('role')).toBe('separator');
    expect(host.getAttribute('aria-controls')).toBe('navigation');
    expect(host.getAttribute('aria-valuenow')).toBe('300');
    key('ArrowRight'); key('ArrowLeft', true); key('Home'); key('End'); key('Enter');
    expect(intents).toEqual([{ kind: 'set', width: 308 }, { kind: 'set', width: 268 }, { kind: 'set', width: 224 }, { kind: 'set', width: 416 }, { kind: 'reset' }]);
    fixture.componentRef.setInput('direction', -1); fixture.detectChanges();
    key('ArrowRight'); key('ArrowLeft');
    expect(intents.slice(-2)).toEqual([{ kind: 'set', width: 292 }, { kind: 'set', width: 308 }]);
  });

  it('captures one pointer, coalesces movement and flushes the release position before commit', () => {
    pointer('pointerdown', 100); pointer('pointermove', 120, 2);
    pointer('pointermove', 130);
    const scheduled = vi.mocked(window.requestAnimationFrame).mock.calls.length;
    pointer('pointermove', 140);
    expect(host.setPointerCapture).toHaveBeenCalledExactlyOnceWith(1);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(scheduled);
    expect(intents).toEqual([{ kind: 'begin' }]);
    frame(0);
    expect(intents.at(-1)).toEqual({ kind: 'preview', width: 340 });
    fixture.componentRef.setInput('value', 340); fixture.detectChanges();
    pointer('pointerup', 100);
    expect(intents.slice(-2)).toEqual([{ kind: 'preview', width: 300 }, { kind: 'commit' }]);
    expect(captured).toBe(false); expect(document.documentElement.style.userSelect).toBe('');
  });

  it.each(['pointercancel', 'lostpointercapture', 'blur', 'resize', 'Escape', 'destroy', 'disabled', 'external cancellation'])('cancels and restores browser state on %s', reason => {
    document.documentElement.style.userSelect = 'text'; document.documentElement.style.cursor = 'crosshair';
    pointer('pointerdown', 100); pointer('pointermove', 120);
    if (reason === 'blur' || reason === 'resize') window.dispatchEvent(new Event(reason));
    else if (reason === 'Escape') key('Escape');
    else if (reason === 'destroy') fixture.destroy();
    else if (reason === 'disabled' || reason === 'external cancellation') {
      fixture.componentRef.setInput(reason === 'disabled' ? 'disabled' : 'resizing', reason === 'disabled'); fixture.detectChanges();
    } else pointer(reason, 120);
    expect(intents).toEqual([{ kind: 'begin' }, { kind: 'cancel' }]);
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(123);
    expect(document.documentElement.style.userSelect).toBe('text');
    expect(document.documentElement.style.cursor).toBe('crosshair');
    document.documentElement.style.userSelect = ''; document.documentElement.style.cursor = '';
  });

  it('disables pointer and keyboard resizing and resets on double click', () => {
    host.dispatchEvent(new MouseEvent('dblclick'));
    expect(intents).toEqual([{ kind: 'reset' }]); intents.length = 0;
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges();
    pointer('pointerdown', 100); key('ArrowRight'); key('Enter');
    expect(intents).toEqual([]); expect(host.getAttribute('tabindex')).toBe('-1');
  });

  it('collapses at the expanded minimum and reopens with the remembered width in either direction', () => {
    fixture.componentRef.setInput('min', 0); fixture.componentRef.setInput('expandedMin', 224);
    fixture.componentRef.setInput('reopenWidth', 320); fixture.componentRef.setInput('value', 224); fixture.detectChanges();
    key('ArrowLeft'); expect(intents.at(-1)).toEqual({ kind: 'set', width: 0 });
    fixture.componentRef.setInput('value', 0); fixture.detectChanges();
    expect(host.getAttribute('aria-valuetext')).toBe('Collapsed');
    key('ArrowRight'); expect(intents.at(-1)).toEqual({ kind: 'set', width: 320 });
    key('End'); expect(intents.at(-1)).toEqual({ kind: 'set', width: 416 });
    fixture.componentRef.setInput('direction', -1); fixture.detectChanges();
    key('ArrowLeft'); expect(intents.at(-1)).toEqual({ kind: 'set', width: 320 });
    key('Home'); expect(intents.at(-1)).toEqual({ kind: 'set', width: 0 });
  });
});
