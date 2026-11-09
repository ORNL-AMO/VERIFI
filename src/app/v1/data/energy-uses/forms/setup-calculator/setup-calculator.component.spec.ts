import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../energy-uses.module';
import { EnergyUseSetupFormService } from '../energy-use-setup-form.service';
import { energyUseSetup } from '../../models/energy-use-setup.models';
import { energyUseItem } from '../../energy-uses.testing';
import { SetupCalculatorComponent } from './setup-calculator.component';

describe('Setup calculator draft boundary', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
    const form = TestBed.inject(EnergyUseSetupFormService).build(energyUseSetup(energyUseItem({ operatingConditionsData: [
      { year: 2024, hoursOfOperation: 100, loadFactor: 50, dutyFactor: 100, efficiency: 100 }
    ] })));
    const fixture = TestBed.createComponent(SetupCalculatorComponent), component = fixture.componentInstance;
    fixture.componentRef.setInput('kind', 'hours'); fixture.componentRef.setInput('conditions', form.controls.conditions.at(0));
    fixture.componentRef.setInput('editorKey', 'item-a'); fixture.componentRef.setInput('canEdit', true); fixture.detectChanges();
    return { fixture, component, conditions: form.controls.conditions.at(0) };
  }
  it('changes only the calculator until Apply, then updates all operating-hours inputs together', () => {
    const { component, conditions } = setup(); component.open(); component.form.patchValue({ hours: 8, days: 5, weeks: 50 });
    expect(conditions.controls.hoursOfOperation.value).toBe(100); expect(component.result()).toBe(2000);
    component.apply(); expect(conditions.getRawValue()).toMatchObject({ hoursOfOperation: 2000, hoursPerDay: 8, daysPerWeek: 5, weeksPerYear: 50 });
  });
  it('cancels without edits and refuses a result after item identity changes', () => {
    const { fixture, component, conditions } = setup(); component.open(); component.form.controls.hours.setValue(8); component.close();
    expect(conditions.controls.hoursOfOperation.value).toBe(100);
    component.open(); fixture.componentRef.setInput('editorKey', 'item-b'); fixture.detectChanges(); component.apply();
    expect(component.opened()).toBe(false); expect(conditions.controls.hoursOfOperation.value).toBe(100);
  });
  it('accepts numeric heat-capacity edits and applies a fuel result only to its source', () => {
    const { fixture, component } = setup();
    const source = TestBed.inject(EnergyUseSetupFormService).settings.source({ energySource: 'Natural Gas', size: 1, units: 'MMBtuhr', numberOfEquipment: 1 });
    fixture.componentRef.setInput('kind', 'power'); fixture.componentRef.setInput('source', source); fixture.detectChanges(); component.open();
    component.form.patchValue({ heatCapacity: 0.002, capacity: 1000 }); fixture.detectChanges();
    expect(component.result()).toBe(2); component.apply();
    expect(source.getRawValue()).toMatchObject({ size: 2, units: 'MMBtuhr', numberOfEquipment: 1 });
  });

});
