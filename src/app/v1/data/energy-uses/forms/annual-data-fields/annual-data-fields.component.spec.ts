import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../energy-uses.module';
import { energyUseItem, energyUseSource } from '../../energy-uses.testing';
import { energyUseSetup } from '../../models/energy-use-setup.models';
import { EnergyUseSetupFormService } from '../energy-use-setup-form.service';
import { AnnualDataFieldsComponent } from './annual-data-fields.component';

describe('Annual Data inside Setup', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
    const item = energyUseItem({ operatingConditionsData: [{ year: 2024, hoursOfOperation: 1000, loadFactor: 50, dutyFactor: 80, efficiency: 80 }],
      utilityData: [energyUseSource({ energyUse: [{ year: 2024, energyUse: 123, overrideEnergyUse: false, energyUseUnit: 'kWh' }] })] });
    const form = TestBed.inject(EnergyUseSetupFormService).build(energyUseSetup(item)), fixture = TestBed.createComponent(AnnualDataFieldsComponent);
    fixture.componentRef.setInput('form', form); fixture.componentRef.setInput('item', item); fixture.componentRef.setInput('canEdit', true);
    fixture.componentRef.setInput('canManageYears', true); fixture.detectChanges();
    return { fixture, form, component: fixture.componentInstance };
  }
  it('shows committed consumption until calculation inputs change without adding inline save messages', () => {
    const { fixture, form } = setup();
    expect(fixture.nativeElement.querySelector('output').textContent).toContain('123');
    expect(fixture.nativeElement.querySelector('.input-group .annual-data__mode')?.getAttribute('aria-label')).toBe('Use manual consumption for Electricity in 2024');
    expect(fixture.nativeElement.textContent).not.toContain('Unsaved preview');
    form.controls.conditions.at(0).controls.hoursOfOperation.setValue(2000); fixture.componentRef.setInput('refreshKey', 1); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('output').textContent).toContain('5,000');
    expect(fixture.nativeElement.textContent).not.toContain('Unsaved preview');
  });
  it('renders annual sections from oldest to newest while retaining saved form order', () => {
    const { fixture, form } = setup(), forms = TestBed.inject(EnergyUseSetupFormService);
    form.controls.conditions.push(forms.conditions({ year: 2022, hoursOfOperation: 1000, loadFactor: 50, dutyFactor: 80, efficiency: 80 }));
    form.controls.consumption.at(0).controls.entries.push(forms.consumption({ year: 2022, energyUse: 0, overrideEnergyUse: true, energyUseUnit: 'kWh' }));
    fixture.componentRef.setInput('refreshKey', 1); fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('h3')].map((heading: HTMLElement) => heading.textContent?.trim())).toEqual(['2022', '2024']);
    expect(form.controls.conditions.getRawValue().map(row => row.year)).toEqual([2024, 2022]);
  });
  it('starts manual override with the displayed value and restores calculations on return', () => {
    const { fixture, form, component } = setup(), row = component.years()[0].sources[0], entry = form.controls.consumption.at(0).controls.entries.at(0);
    fixture.nativeElement.querySelector('.annual-data__mode').click(); fixture.componentRef.setInput('refreshKey', 1); fixture.detectChanges();
    expect(entry.getRawValue()).toMatchObject({ energyUse: 123, overrideEnergyUse: true });
    expect(fixture.nativeElement.querySelector('.input-group .annual-data__mode')?.getAttribute('aria-label')).toBe('Use calculated consumption for Electricity in 2024');
    fixture.nativeElement.querySelector('.annual-data__mode').click(); fixture.componentRef.setInput('refreshKey', 2); fixture.detectChanges();
    expect(component.years()[0].sources[0].amount).toBe(123);
    expect(entry.controls.overrideEnergyUse.value).toBe(false);
  });
  it('gates year actions separately from editable annual fields', () => {
    const { fixture, component } = setup(), host = fixture.nativeElement as HTMLElement, added = vi.fn();
    component.addRequested.subscribe(added);
    fixture.componentRef.setInput('canManageYears', false); fixture.detectChanges();
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('.annual-data__heading button')];
    expect(buttons.every(button => button.disabled)).toBe(true);
    expect(host.querySelector('input[formcontrolname="hoursOfOperation"]')!.matches(':disabled')).toBe(false);
    buttons[0].click(); expect(added).not.toHaveBeenCalled();
    fixture.componentRef.setInput('canManageYears', true); fixture.detectChanges();
    expect(buttons.every(button => !button.disabled)).toBe(true);
    buttons[0].click(); expect(added).toHaveBeenCalledOnce();
  });
});
