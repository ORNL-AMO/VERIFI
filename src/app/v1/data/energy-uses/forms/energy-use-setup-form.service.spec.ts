import { TestBed } from '@angular/core/testing';
import { energyUseItem, energyUseSource } from '../energy-uses.testing';
import { energyUseSetup, normalizeEnergyUseSetup } from '../models/energy-use-setup.models';
import { EnergyUseSetupFormService } from './energy-use-setup-form.service';

describe('Energy Use Setup typed form', () => {
  const item = energyUseItem({ operatingConditionsData: [{ year: 2024, hoursOfOperation: 1000, loadFactor: 50, dutyFactor: 100, efficiency: 90 }],
    utilityData: [energyUseSource({ energyUse: [{ year: 2024, energyUse: 123, overrideEnergyUse: false, energyUseUnit: 'kWh' }] })] });
  it('hydrates silently and excludes derived values and absent calculator inputs from draft equality', () => {
    const forms = TestBed.inject(EnergyUseSetupFormService), value = energyUseSetup(item), form = forms.build(value), changed = vi.fn();
    form.valueChanges.subscribe(changed); forms.hydrate(form, value, 'reset');
    expect(changed).not.toHaveBeenCalled(); expect(normalizeEnergyUseSetup(forms.read(form))).toEqual(value);
  });
  it('retains year/source controls through same-identity publication and updates contextual validity', () => {
    const forms = TestBed.inject(EnergyUseSetupFormService), value = energyUseSetup(item), form = forms.build(value);
    const conditions = form.controls.conditions.at(0), entry = form.controls.consumption.at(0).controls.entries.at(0);
    forms.hydrate(form, { ...value, notes: 'Elsewhere' }, 'reconcile');
    expect(form.controls.conditions.at(0)).toBe(conditions); expect(form.controls.consumption.at(0).controls.entries.at(0)).toBe(entry);
    forms.validate(form, value); conditions.controls.efficiency.setValue(0);
    expect(form.errors?.['energyUseSetup']).toContain('2024');
  });
  it('clears omitted calculator inputs without replacing controls or emitting edits', () => {
    const forms = TestBed.inject(EnergyUseSetupFormService), value = energyUseSetup(item);
    const original = { ...value, conditions: value.conditions.map(row => ({ ...row, hoursPerDay: 8, daysPerWeek: 5, weeksPerYear: 50 })) };
    const form = forms.build(original), conditions = form.controls.conditions.at(0), changed = vi.fn();
    form.valueChanges.subscribe(changed); forms.hydrate(form, value, 'reconcile');
    expect(form.controls.conditions.at(0)).toBe(conditions); expect(changed).not.toHaveBeenCalled();
    expect(conditions.getRawValue()).toMatchObject({ hoursPerDay: null, daysPerWeek: null, weeksPerYear: null });
    expect(normalizeEnergyUseSetup(forms.read(form))).toEqual(value);
  });
  it('validates normalized values so empty optional controls do not invalidate untouched legacy history', () => {
    const forms = TestBed.inject(EnergyUseSetupFormService), value = energyUseSetup({ ...item,
      operatingConditionsData: item.operatingConditionsData.map(row => ({ ...row, hoursOfOperation: -1 })) });
    const form = forms.build(value); forms.validate(form, value);
    form.controls.settings.controls.name.setValue('Metadata only');
    expect(form.valid).toBe(true);
    form.controls.conditions.at(0).controls.hoursOfOperation.setValue(-2);
    expect(form.errors?.['energyUseSetup']).toContain('2024');
  });
});
