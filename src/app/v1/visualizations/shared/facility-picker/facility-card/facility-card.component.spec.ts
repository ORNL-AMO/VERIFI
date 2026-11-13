import { TestBed } from '@angular/core/testing';
import { FacilityCardComponent, FACILITY_POINTER_CLICK_DELAY } from './facility-card.component';
import { FacilityCardModule } from './facility-card.module';

describe('facility card pointer and keyboard choices', () => {
  afterEach(() => vi.useRealTimers());
  function setup() {
    TestBed.configureTestingModule({ imports: [FacilityCardModule] });
    const fixture = TestBed.createComponent(FacilityCardComponent), changed = vi.fn(), only = vi.fn();
    fixture.componentRef.setInput('label', 'Roasting'); fixture.componentRef.setInput('selected', true);
    fixture.componentInstance.selectionRequested.subscribe(changed); fixture.componentInstance.onlyRequested.subscribe(only); fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    const pointer = (detail: number) => label.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }));
    return { fixture, changed, only, label, pointer, checkbox: label.querySelector('input')! };
  }
  it('waits for a single pointer choice without changing authoritative checked state', () => {
    vi.useFakeTimers(); const state = setup(); state.pointer(1);
    expect(state.changed).not.toHaveBeenCalled(); expect(state.checkbox.checked).toBe(true);
    vi.advanceTimersByTime(FACILITY_POINTER_CLICK_DELAY - 1); expect(state.changed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(state.changed).toHaveBeenCalledExactlyOnceWith(false); expect(state.only).not.toHaveBeenCalled();
    state.fixture.destroy();
  });
  it('requests only-selection once for a double click without an intermediate toggle', () => {
    vi.useFakeTimers(); const state = setup(); state.pointer(1); state.pointer(2);
    state.label.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2 }));
    expect(state.only).toHaveBeenCalledOnce(); expect(state.changed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FACILITY_POINTER_CLICK_DELAY); expect(state.changed).not.toHaveBeenCalled(); expect(state.checkbox.checked).toBe(true);
    state.fixture.destroy();
  });
  it('keeps keyboard activation immediate and cancels any pending pointer proposal', () => {
    vi.useFakeTimers(); const state = setup(); state.pointer(1); state.checkbox.click();
    expect(state.changed).toHaveBeenCalledExactlyOnceWith(false); expect(state.checkbox.checked).toBe(true);
    vi.advanceTimersByTime(FACILITY_POINTER_CLICK_DELAY); expect(state.changed).toHaveBeenCalledOnce(); state.fixture.destroy();
  });
  it.each([['selected', false], ['disabled', true], ['interactionKey', { revision: 2 }]] as const)('invalidates a queued choice when %s changes', (name, value) => {
    vi.useFakeTimers(); const state = setup(); state.pointer(1);
    state.fixture.componentRef.setInput(name, value); state.fixture.detectChanges();
    vi.advanceTimersByTime(FACILITY_POINTER_CLICK_DELAY); expect(state.changed).not.toHaveBeenCalled(); state.fixture.destroy();
  });
  it('cleans up a pending pointer choice when destroyed', () => {
    vi.useFakeTimers(); const state = setup(); state.pointer(1); state.fixture.destroy();
    vi.advanceTimersByTime(FACILITY_POINTER_CLICK_DELAY); expect(state.changed).not.toHaveBeenCalled(); expect(state.only).not.toHaveBeenCalled();
  });
  it('pauses an existing proposal during a save and resumes it asynchronously', () => {
    vi.useFakeTimers(); const state = setup(); state.pointer(1);
    state.fixture.componentRef.setInput('busy', true); state.fixture.detectChanges();
    expect(state.checkbox.disabled).toBe(true);
    state.pointer(1); state.checkbox.click();
    state.label.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2 }));
    vi.advanceTimersByTime(FACILITY_POINTER_CLICK_DELAY);
    expect(state.changed).not.toHaveBeenCalled(); expect(state.only).not.toHaveBeenCalled();
    state.fixture.componentRef.setInput('busy', false); state.fixture.detectChanges();
    expect(state.checkbox.disabled).toBe(false); expect(state.changed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0); expect(state.changed).toHaveBeenCalledExactlyOnceWith(false);
    state.fixture.destroy();
  });
  it.each([['selected', false], ['disabled', true], ['interactionKey', { revision: 2 }]] as const)('invalidates a paused proposal when %s changes', (name, value) => {
    vi.useFakeTimers(); const state = setup(); state.pointer(1);
    state.fixture.componentRef.setInput('busy', true); state.fixture.detectChanges();
    vi.advanceTimersByTime(FACILITY_POINTER_CLICK_DELAY);
    state.fixture.componentRef.setInput(name, value); state.fixture.detectChanges();
    state.fixture.componentRef.setInput('busy', false); state.fixture.detectChanges();
    vi.advanceTimersByTime(0); expect(state.changed).not.toHaveBeenCalled(); state.fixture.destroy();
  });
  it('allows exclusive card selection while locking its final checkbox against deselection', () => {
    vi.useFakeTimers(); const state = setup();
    state.fixture.componentRef.setInput('uncheckLocked', true); state.fixture.detectChanges();
    expect(state.checkbox.disabled).toBe(true); state.pointer(1); state.pointer(2);
    state.label.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2 }));
    expect(state.only).toHaveBeenCalledOnce(); vi.advanceTimersByTime(FACILITY_POINTER_CLICK_DELAY);
    expect(state.changed).not.toHaveBeenCalled(); state.fixture.destroy();
  });
  it('offers an independent Only button, cancels a pending pointer toggle, and retains button focus', () => {
    vi.useFakeTimers(); const state = setup();
    expect(state.fixture.nativeElement.querySelector('button')).toBeNull();
    state.fixture.componentRef.setInput('showOnly', true); state.fixture.detectChanges();
    state.pointer(1);
    const only = state.fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(only.getAttribute('aria-label')).toBe('Select only Roasting'); expect(only.closest('label')).toBeNull();
    only.focus(); only.click();
    expect(state.only).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(only);
    vi.advanceTimersByTime(FACILITY_POINTER_CLICK_DELAY); expect(state.changed).not.toHaveBeenCalled();
    state.fixture.destroy();
  });
  it('keeps Only available for a locked checkbox while honoring disabled and busy guards', () => {
    const state = setup(); state.fixture.componentRef.setInput('showOnly', true);
    state.fixture.componentRef.setInput('uncheckLocked', true); state.fixture.detectChanges();
    const only = state.fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(state.checkbox.disabled).toBe(true); expect(only.disabled).toBe(false); only.click();
    expect(state.only).toHaveBeenCalledOnce(); state.only.mockClear();
    for (const guard of ['disabled', 'busy'] as const) {
      state.fixture.componentRef.setInput(guard, true); state.fixture.detectChanges();
      expect(only.disabled).toBe(true); only.click(); state.fixture.componentInstance.requestOnly();
      expect(state.only).not.toHaveBeenCalled(); expect(state.changed).not.toHaveBeenCalled();
      state.fixture.componentRef.setInput(guard, false); state.fixture.detectChanges();
    }
    state.fixture.destroy();
  });

});
