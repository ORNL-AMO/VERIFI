import { TestBed } from '@angular/core/testing';
import { FacilityPickerComponent } from './facility-picker.component';
import { FacilityPickerModule } from './facility-picker.module';
import type { VisualizationFacilitySelection } from '@domain/visualizations/visualization-definition';

describe('visualization facility cards', () => {
  function setup(selection: VisualizationFacilitySelection = { kind: 'all' }) {
    TestBed.configureTestingModule({ imports: [FacilityPickerModule] });
    const fixture = TestBed.createComponent(FacilityPickerComponent), requested = vi.fn();
    fixture.componentRef.setInput('selection', selection);
    fixture.componentRef.setInput('facilities', [{ guid: 'a', name: 'Roasting' }, { guid: 'b', name: 'Peanuts' }]);
    fixture.componentInstance.selectionRequested.subscribe(requested); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, requested, root: fixture.nativeElement as HTMLElement };
  }
  it('proposes a subset without changing checkmarks before the parent accepts it', () => {
    const { component, requested, root, fixture } = setup();
    root.querySelector<HTMLInputElement>('[aria-label="Roasting"]')!.click(); fixture.detectChanges();
    expect(requested).toHaveBeenCalledExactlyOnceWith({ kind: 'fixed', facilityGuids: ['b'] });
    expect(root.querySelector('[aria-label="Roasting"]')?.getAttribute('aria-checked')).toBe('true');
    expect(root.querySelector<HTMLInputElement>('[aria-label="Roasting"]')!.checked).toBe(true);
    expect(root.querySelector<HTMLInputElement>('[aria-label="Roasting"]')!.closest('label')?.classList.contains('facility-picker__row')).toBe(true);
    expect(component.selectedCount()).toBe(2);
    fixture.componentRef.setInput('selection', requested.mock.calls[0][0]); fixture.detectChanges();
    expect(root.querySelector('[aria-label="Roasting"]')?.getAttribute('aria-checked')).toBe('false');
    expect(root.querySelector<HTMLInputElement>('[aria-label="Roasting"]')!.checked).toBe(false);
    expect(root.querySelector<HTMLInputElement>('[aria-label="Peanuts"]')!.disabled).toBe(true);
  });
  it('promotes checking every row to live All and follows future catalog entries without emitting', () => {
    const { component, fixture, requested } = setup({ kind: 'fixed', facilityGuids: ['a'] });
    component.toggle('b'); expect(requested).toHaveBeenCalledExactlyOnceWith({ kind: 'all' });
    fixture.componentRef.setInput('selection', { kind: 'all' }); fixture.detectChanges(); requested.mockClear();
    fixture.componentRef.setInput('facilities', [{ guid: 'a' }, { guid: 'b' }, { guid: 'c', name: 'New facility' }]); fixture.detectChanges();
    expect(component.selectedCount()).toBe(3); expect(component.rows().every(item => item.selected)).toBe(true);
    component.selectAll(); expect(requested).not.toHaveBeenCalled();
  });
  it('keeps filtering separate from selection and retains missing identities', () => {
    const { component, fixture, requested } = setup({ kind: 'fixed', facilityGuids: ['a', 'missing'] });
    component.search.setValue('Peanuts'); fixture.detectChanges();
    expect(component.rows().map(item => item.guid)).toEqual(['b']); expect(component.selectedCount()).toBe(2);
    expect(requested).not.toHaveBeenCalled(); component.search.setValue(''); fixture.detectChanges();
    expect(component.rows().find(item => item.guid === 'missing')).toMatchObject({ missing: true, selected: true });
    component.toggle('missing'); expect(requested).toHaveBeenLastCalledWith({ kind: 'fixed', facilityGuids: ['a'] });
  });
  it('blocks the final deselection and disabled proposals', () => {
    const { component, fixture, requested } = setup({ kind: 'fixed', facilityGuids: ['a'] });
    component.toggle('a'); expect(requested).not.toHaveBeenCalled();
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges();
    component.toggle('b'); component.selectAll(); expect(requested).not.toHaveBeenCalled();
  });
  it('does not opt into future facilities when removing a missing identity', () => {
    const { fixture, component, requested } = setup({ kind: 'fixed', facilityGuids: ['a', 'missing'] });
    fixture.componentRef.setInput('facilities', [{ guid: 'a', name: 'Roasting' }]); fixture.detectChanges();
    component.toggle('missing');
    expect(requested).toHaveBeenCalledExactlyOnceWith({ kind: 'fixed', facilityGuids: ['a'] });
  });
  it('selects only the double-clicked facility without first toggling it or promoting to All', () => {
    vi.useFakeTimers();
    try {
      const { fixture, root, component, requested } = setup();
      const label = root.querySelector<HTMLInputElement>('[aria-label="Roasting"]')!.closest('label')!;
      for (const detail of [1, 2]) label.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }));
      label.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2 }));
      expect(requested).toHaveBeenCalledExactlyOnceWith({ kind: 'fixed', facilityGuids: ['a'] });
      vi.advanceTimersByTime(500); expect(requested).toHaveBeenCalledOnce(); expect(component.selectedIds()).toEqual(['a', 'b']);
      fixture.componentRef.setInput('facilities', [{ guid: 'a', name: 'Roasting' }]); fixture.detectChanges(); requested.mockClear();
      const sole = root.querySelector<HTMLInputElement>('[aria-label="Roasting"]')!;
      expect(sole.disabled).toBe(true);
      sole.closest('label')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2 }));
      expect(requested).toHaveBeenCalledExactlyOnceWith({ kind: 'fixed', facilityGuids: ['a'] });
      fixture.destroy();
    } finally { vi.useRealTimers(); }
  });
  it.each([
    { selection: { kind: 'all' } as VisualizationFacilitySelection, expected: [
      { kind: 'fixed', facilityGuids: ['b', 'c'] }, { kind: 'fixed', facilityGuids: ['c'] }
    ] },
    { selection: { kind: 'fixed', facilityGuids: ['c'] } as VisualizationFacilitySelection, expected: [
      { kind: 'fixed', facilityGuids: ['c', 'a'] }, { kind: 'all' }
    ] }
  ])('rebases rapid sibling clicks after the parent accepts the first choice: $selection.kind', ({ selection, expected }) => {
    vi.useFakeTimers();
    try {
      const { fixture, root, requested } = setup(selection);
      fixture.componentRef.setInput('facilities', [{ guid: 'a', name: 'Roasting' }, { guid: 'b', name: 'Peanuts' }, { guid: 'c', name: 'HQ' }]);
      fixture.componentInstance.selectionRequested.subscribe(value => {
        fixture.componentRef.setInput('selection', value); fixture.detectChanges();
      });
      fixture.detectChanges();
      const click = (name: string) => root.querySelector<HTMLInputElement>(`[aria-label="${name}"]`)!.closest('label')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      click('Roasting'); vi.advanceTimersByTime(100); click('Peanuts');
      vi.advanceTimersByTime(400); expect(requested.mock.calls.map(call => call[0])).toEqual(expected.slice(0, 1));
      vi.advanceTimersByTime(100); expect(requested.mock.calls.map(call => call[0])).toEqual(expected);
      fixture.destroy();
    } finally { vi.useRealTimers(); }
  });
  it('cancels a queued pointer choice when the editor context changes', () => {
    vi.useFakeTimers();
    try {
      const { fixture, root, requested } = setup();
      root.querySelector<HTMLInputElement>('[aria-label="Roasting"]')!.closest('label')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      fixture.componentRef.setInput('contextKey', 'another-visualization'); fixture.detectChanges();
      vi.advanceTimersByTime(500); expect(requested).not.toHaveBeenCalled(); fixture.destroy();
    } finally { vi.useRealTimers(); }
  });
  it('retains a sibling proposal while the first accepted choice is being saved', () => {
    vi.useFakeTimers();
    try {
      const { fixture, root, requested } = setup();
      const facilities = [{ guid: 'a', name: 'Roasting' }, { guid: 'b', name: 'Peanuts' }, { guid: 'c', name: 'HQ' }];
      fixture.componentRef.setInput('facilities', facilities);
      fixture.componentInstance.selectionRequested.subscribe(value => {
        fixture.componentRef.setInput('selection', value);
        fixture.componentRef.setInput('busy', true); fixture.detectChanges();
      });
      fixture.detectChanges();
      const click = (name: string) => root.querySelector<HTMLInputElement>(`[aria-label="${name}"]`)!.closest('label')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      click('Roasting'); vi.advanceTimersByTime(100); click('Peanuts'); vi.advanceTimersByTime(400);
      expect(requested).toHaveBeenCalledExactlyOnceWith({ kind: 'fixed', facilityGuids: ['b', 'c'] });
      expect(root.querySelector<HTMLInputElement>('[aria-label="Peanuts"]')!.disabled).toBe(true);
      vi.advanceTimersByTime(100); expect(requested).toHaveBeenCalledOnce();
      fixture.componentRef.setInput('facilities', structuredClone(facilities));
      fixture.componentRef.setInput('busy', false); fixture.detectChanges(); expect(requested).toHaveBeenCalledOnce();
      vi.advanceTimersByTime(0);
      expect(requested).toHaveBeenLastCalledWith({ kind: 'fixed', facilityGuids: ['c'] });
      expect(requested).toHaveBeenCalledTimes(2); fixture.destroy();
    } finally { vi.useRealTimers(); }
  });
  it('cancels a queued choice when facility membership changes', () => {
    vi.useFakeTimers();
    try {
      const { fixture, root, requested } = setup();
      root.querySelector<HTMLInputElement>('[aria-label="Roasting"]')!.closest('label')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      fixture.componentRef.setInput('facilities', [{ guid: 'a', name: 'Roasting' }, { guid: 'b', name: 'Peanuts' }, { guid: 'c', name: 'HQ' }]);
      fixture.detectChanges(); vi.advanceTimersByTime(500);
      expect(requested).not.toHaveBeenCalled(); fixture.destroy();
    } finally { vi.useRealTimers(); }
  });
});
