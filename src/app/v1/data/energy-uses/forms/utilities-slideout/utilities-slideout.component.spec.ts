import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../energy-uses.module';
import { defaultEnergyUseSource } from '../../models/energy-use-settings.models';
import { UtilitiesSlideoutComponent } from './utilities-slideout.component';

describe('Energy Use utility selection', () => {
  it('keeps checkbox changes local until confirmation', () => {
    TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
    const fixture = TestBed.createComponent(UtilitiesSlideoutComponent);
    const confirmed = vi.fn(); fixture.componentInstance.confirmed.subscribe(confirmed);
    fixture.componentRef.setInput('sources', [defaultEnergyUseSource()]); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls['Electricity'].value).toBe(true);
    expect(confirmed).not.toHaveBeenCalled();
    fixture.componentInstance.form.controls['Natural Gas'].setValue(true);
    fixture.componentInstance.form.controls['Electricity'].setValue(false);
    expect(confirmed).not.toHaveBeenCalled();
    fixture.componentInstance.confirm();
    expect(confirmed).toHaveBeenCalledWith({ baseline: [defaultEnergyUseSource()], selected: ['Natural Gas'] });
  });
  it('retains imported extra utilities and disables new choices at the limit', () => {
    TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
    const fixture = TestBed.createComponent(UtilitiesSlideoutComponent);
    fixture.componentRef.setInput('sources', [defaultEnergyUseSource(), defaultEnergyUseSource('Natural Gas'), defaultEnergyUseSource('Other Energy')]);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls['Other Energy'].value).toBe(true);
    expect(fixture.componentInstance.form.controls['Other Fuels'].disabled).toBe(true);
    expect(fixture.componentInstance.form.controls['Electricity'].enabled).toBe(true);
    fixture.componentInstance.form.controls['Other Energy'].setValue(false); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls['Other Energy'].enabled).toBe(true);
    fixture.componentInstance.form.controls['Other Energy'].setValue(true); fixture.detectChanges();
    expect(fixture.componentInstance.canConfirm()).toBe(true);
    expect(fixture.componentInstance.form.controls['Other Fuels'].disabled).toBe(true);
  });
  it('cancels without applying checkbox changes and blocks an obsolete selection', () => {
    TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
    const fixture = TestBed.createComponent(UtilitiesSlideoutComponent), confirmed = vi.fn(), closed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed); fixture.componentInstance.closed.subscribe(closed);
    fixture.componentRef.setInput('sources', [defaultEnergyUseSource()]); fixture.detectChanges();
    fixture.componentInstance.form.controls['Natural Gas'].setValue(true);
    const cancel = [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) => button.textContent?.trim() === 'Cancel') as HTMLButtonElement;
    cancel.click(); expect(closed).toHaveBeenCalledTimes(1); expect(confirmed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('sources', [{ ...defaultEnergyUseSource(), size: 10 }]); fixture.detectChanges();
    expect(fixture.componentInstance.stale()).toBe(true); fixture.componentInstance.confirm();
    expect(confirmed).not.toHaveBeenCalled();
  });
});
