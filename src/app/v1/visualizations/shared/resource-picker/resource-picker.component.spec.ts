import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { vi } from 'vitest';
import { ResourcePickerComponent } from './resource-picker.component';
import { ResourcePickerModule } from './resource-picker.module';

describe('visualization resource picker', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup(selected = ['meter-a']) {
    TestBed.configureTestingModule({ imports: [ResourcePickerModule] });
    const fixture = TestBed.createComponent(ResourcePickerComponent);
    const control = new FormControl(selected, { nonNullable: true });
    fixture.componentRef.setInput('control', control); fixture.componentRef.setInput('label', 'Meters');
    fixture.componentRef.setInput('options', [{ guid: 'meter-a', label: 'Main meter' }, { guid: 'meter-b', label: 'Boiler meter' }]);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, control };
  }

  it('filters locally without changing selection, and updates typed selection through rendered rows', () => {
    const { fixture, component, control } = setup();
    const changed = vi.fn(); control.valueChanges.subscribe(changed);
    component.filter.setValue('boiler'); fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.resource-picker__option') as NodeListOf<HTMLButtonElement>;
    expect(rows.length).toBe(1); expect(rows[0].textContent).toContain('Boiler meter');
    expect(control.value).toEqual(['meter-a']); expect(control.pristine).toBe(true); expect(changed).not.toHaveBeenCalled();
    rows[0].click(); fixture.detectChanges();
    expect(control.value).toEqual(['meter-a', 'meter-b']); expect(control.dirty).toBe(true);
    expect(rows[0].getAttribute('aria-checked')).toBe('true');
    expect(control.value).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.resource-picker__selected')).toBeNull();
  });

  it('requests reviewed changes without mutating its control until the host applies them', () => {
    const { fixture, component, control } = setup();
    fixture.componentRef.setInput('requestChanges', true); fixture.detectChanges();
    const requested = vi.fn(); component.selectionRequested.subscribe(requested);
    (fixture.nativeElement.querySelector('.resource-picker__option') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(requested).toHaveBeenCalledWith({ guid: 'meter-a', selected: false });
    expect(control.value).toEqual(['meter-a']); expect(control.pristine).toBe(true);
    expect(fixture.nativeElement.querySelector('.resource-picker__option').getAttribute('aria-checked')).toBe('true');
  });
  it('retains unavailable selected identities and removes them only through an explicit action', () => {
    const { fixture, control } = setup(['missing']);
    expect(fixture.nativeElement.textContent).toContain('Unavailable: missing');
    expect(control.value).toEqual(['missing']);
    (fixture.nativeElement.querySelector('.resource-picker__option--unavailable') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(control.value).toEqual([]); expect(fixture.nativeElement.querySelector('.resource-picker__option--unavailable')).toBeNull();
  });

  it('renders empty and filtered states, permits clearing search, and respects disabled edits', () => {
    const { fixture, component, control } = setup([]);
    component.filter.setValue('missing'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No matching resources.');
    (fixture.nativeElement.querySelector('.resource-picker__clear') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(component.filter.value).toBe('');
    control.disable({ emitEvent: false });
    // Silent external form mutations do not schedule a view check. The routed host
    // also updates the disabled input; this test isolates the control guard.
    fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.resource-picker__option') as HTMLButtonElement;
    expect(row.disabled).toBe(true); row.click(); expect(control.value).toEqual([]);
    fixture.componentRef.setInput('options', []); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No resources available in this scope.');
  });

  it('silently hydrates saved selection without publishing another change', () => {
    const { fixture, control } = setup();
    const changed = vi.fn(); control.valueChanges.subscribe(changed);
    control.reset(['meter-b'], { emitEvent: false });
    fixture.componentRef.setInput('options', [{ guid: 'meter-a', label: 'Main meter' }, { guid: 'meter-b', label: 'Boiler meter updated' }]); fixture.detectChanges();
    const selected = fixture.nativeElement.querySelector('.resource-picker__option[aria-checked="true"]') as HTMLElement;
    expect(selected.textContent).toContain('Boiler meter updated'); expect(selected.textContent).not.toContain('Main meter');
    expect(control.pristine).toBe(true); expect(changed).not.toHaveBeenCalled();
  });
  it('shows Include All first and selects the full list independently of search', () => {
    const { fixture, component, control } = setup([]);
    component.filter.setValue('boiler'); fixture.detectChanges();
    const all = fixture.nativeElement.querySelector('.resource-picker__options button') as HTMLButtonElement;
    expect(all.textContent?.trim()).toBe('Include All'); expect(all.getAttribute('aria-checked')).toBe('false');
    all.click(); fixture.detectChanges();
    expect(control.value).toEqual(['meter-a', 'meter-b']); expect(all.getAttribute('aria-checked')).toBe('true');
    all.click(); fixture.detectChanges();
    expect(control.value).toEqual([]); expect(all.getAttribute('aria-checked')).toBe('false');
  });
  it('requests one Include All change and keeps the current checkmarks until it is applied', () => {
    const { fixture, component, control } = setup();
    fixture.componentRef.setInput('requestChanges', true); fixture.detectChanges();
    const requested = vi.fn(); component.selectionSetRequested.subscribe(requested);
    const all = fixture.nativeElement.querySelector('.resource-picker__all') as HTMLButtonElement;
    all.click(); fixture.detectChanges();
    expect(requested).toHaveBeenCalledExactlyOnceWith(['meter-a', 'meter-b']);
    expect(control.value).toEqual(['meter-a']); expect(control.pristine).toBe(true);
    expect(all.getAttribute('aria-checked')).toBe('false');
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges();
    all.click(); expect(requested).toHaveBeenCalledOnce();
  });
});
