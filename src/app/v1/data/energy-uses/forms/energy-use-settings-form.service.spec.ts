import { EnergyUseSettingsFormService } from './energy-use-settings-form.service';
import { energyUseSettings } from '../models/energy-use-settings.models';
import { energyUseItem } from '../energy-uses.testing';
import { defaultEnergyUseSource } from '../models/energy-use-settings.models';

describe('Energy Use typed form', () => {
  const service = new EnergyUseSettingsFormService();
  it('sets linked groups and their utility selection in one form change', () => {
    const form = service.build(energyUseSettings(energyUseItem({ utilityMeterGroupIds: [] }))), changes = vi.fn();
    form.valueChanges.subscribe(changes);
    expect(service.applyMeterGroups(form, { baseline: [], selected: ['gas-group'],
      utilities: { baseline: form.controls.sources.getRawValue(), selected: ['Natural Gas'] } })).toBe(true);
    expect(changes).toHaveBeenCalledTimes(1);
    expect(form.controls.utilityMeterGroupIds.value).toEqual(['gas-group']);
    expect(form.controls.sources.getRawValue()).toEqual([defaultEnergyUseSource('Natural Gas')]);
  });
  it('applies a confirmed replacement in one form change and preserves retained controls', () => {
    const form = service.build(energyUseSettings(energyUseItem()));
    const gas = service.source({ ...defaultEnergyUseSource('Natural Gas'), size: 25 });
    form.controls.sources.push(gas);
    const baseline = form.controls.sources.getRawValue(), changes = vi.fn(); form.valueChanges.subscribe(changes);
    expect(service.applyUtilities(form, { baseline, selected: ['Natural Gas', 'Other Fuels'] })).toBe(true);
    expect(changes).toHaveBeenCalledTimes(1);
    expect(form.controls.sources.at(0)).toBe(gas);
    expect(form.controls.sources.getRawValue()).toEqual([gas.getRawValue(), defaultEnergyUseSource('Other Fuels')]);
    expect(service.applyUtilities(form, { baseline, selected: ['Electricity'] })).toBe(false);
    expect(changes).toHaveBeenCalledTimes(1);
  });
  it('hydrates without events, preserves equivalent raw text and retains source control identity', () => {
    const value = energyUseSettings(energyUseItem()), form = service.build(value);
    form.controls.name.setValue('Pump A ');
    const source = form.controls.sources.at(0), changes = vi.fn(); form.valueChanges.subscribe(changes);
    service.hydrate(form, { ...value, notes: 'Saved elsewhere' }, 'reconcile');
    expect(form.controls.name.value).toBe('Pump A '); expect(form.controls.notes.value).toBe('Saved elsewhere');
    expect(form.controls.sources.at(0)).toBe(source); expect(changes).not.toHaveBeenCalled();
    service.hydrate(form, value, 'reset'); expect(form.controls.name.value).toBe('Pump A');
  });
  it('validates changed sources without forbidding metadata edits to untouched imported values', () => {
    const item = energyUseItem(); item.utilityData[0].units = 'legacy-unit';
    const base = energyUseSettings(item), form = service.build(base);
    form.controls.notes.setValue('Notes'); expect(form.valid).toBe(true);
    form.controls.sources.at(0).controls.size.setValue(10); expect(form.invalid).toBe(true);
    form.controls.sources.at(0).controls.units.setValue('kW'); expect(form.valid).toBe(true);
    form.controls.sources.at(0).controls.numberOfEquipment.setValue(1.5); expect(form.valid).toBe(true);
    form.controls.sources.at(0).controls.size.setValue(null); expect(form.invalid).toBe(true);
  });
});
