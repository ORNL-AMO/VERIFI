import { TestBed } from '@angular/core/testing';
import { buildMeterCards } from '../../models';
import { meter } from '../../facility-meters.testing';
import { buildMeterDirectory } from '../meters-dashboard.view';
import { MeterDirectoryComponent } from './meter-directory.component';

describe('MeterDirectoryComponent', () => {
  it('emits separate navigation, selection and emphasis events with accessible coverage', () => {
    TestBed.configureTestingModule({ imports: [MeterDirectoryComponent] });
    const fixture = TestBed.createComponent(MeterDirectoryComponent);
    fixture.componentRef.setInput('entries', buildMeterDirectory(buildMeterCards([meter({ guid: 'm' })], [], []), [], [], 'ready'));
    fixture.componentRef.setInput('canAct', true); fixture.componentRef.setInput('selecting', true);
    const action = vi.fn(), selection = vi.fn(), emphasis = vi.fn();
    fixture.componentInstance.action.subscribe(action); fixture.componentInstance.selectionChanged.subscribe(selection); fixture.componentInstance.emphasized.subscribe(emphasis);
    fixture.detectChanges();
    const open = fixture.nativeElement.querySelector('.meter-directory__open') as HTMLButtonElement;
    open.click(); expect(action).toHaveBeenCalledWith({ guid: 'm', action: 'settings' });
    const checkbox = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    checkbox.click(); expect(selection).toHaveBeenCalledWith({ guid: 'm', selected: true });
    expect(action).toHaveBeenCalledTimes(1);
    open.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); expect(emphasis).toHaveBeenCalledWith('m');
    expect(fixture.nativeElement.querySelector('#' + open.getAttribute('aria-describedby')).textContent).toContain('No monthly data');
    fixture.componentRef.setInput('canAct', false); fixture.detectChanges(); expect(checkbox.disabled).toBe(true);
  });
});
