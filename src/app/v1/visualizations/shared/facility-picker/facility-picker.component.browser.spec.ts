import { TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import { FacilityPickerComponent } from './facility-picker.component';
import { FacilityPickerModule } from './facility-picker.module';

describe('visualization facility picker keyboard choices in Chromium', () => {
  it('pins sole-facility All through Only, retains focus, and restores live All with its checkbox', async () => {
    TestBed.configureTestingModule({ imports: [FacilityPickerModule] });
    const fixture = TestBed.createComponent(FacilityPickerComponent), requested = vi.fn();
    fixture.componentRef.setInput('selection', { kind: 'all' });
    fixture.componentRef.setInput('facilities', [{ guid: 'a', name: 'Roasting' }]);
    fixture.componentInstance.selectionRequested.subscribe(value => {
      requested(value); fixture.componentRef.setInput('selection', value); fixture.detectChanges();
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const all = root.querySelector<HTMLInputElement>('[aria-label="All Facilities"]')!;
    const facility = root.querySelector<HTMLInputElement>('[aria-label="Roasting"]')!;
    const only = root.querySelector<HTMLButtonElement>('[aria-label="Select only Roasting"]')!;
    expect(all.disabled).toBe(true); expect(facility.disabled).toBe(true); expect(only.disabled).toBe(false);
    expect(only.closest('label')).toBeNull();
    root.querySelector<HTMLInputElement>('input[type="search"]')!.focus();
    await userEvent.keyboard('{Tab}'); expect(document.activeElement).toBe(only);
    await userEvent.keyboard('{Enter}'); fixture.detectChanges();
    expect(requested).toHaveBeenCalledExactlyOnceWith({ kind: 'fixed', facilityGuids: ['a'] });
    expect(document.activeElement).toBe(only); expect(facility.disabled).toBe(true); expect(all.disabled).toBe(false);
    await userEvent.keyboard('{Enter}'); fixture.detectChanges();
    facility.click(); expect(requested).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}'); expect(document.activeElement).toBe(all);
    await userEvent.keyboard(' '); fixture.detectChanges();
    expect(requested).toHaveBeenLastCalledWith({ kind: 'all' }); expect(requested).toHaveBeenCalledTimes(2);
    expect(all.disabled).toBe(true); expect(facility.disabled).toBe(true);
    all.click(); facility.click(); expect(requested).toHaveBeenCalledTimes(2);
    fixture.destroy();
  });
});
