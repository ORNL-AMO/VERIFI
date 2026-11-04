import { meter, facility } from '@app/v1/data/meters/facility-meters.testing';
import { reconcileMeterSettings } from '@app/v1/data/meters/meter-settings-editing';
import { applyMeterSettings, normalizeMeterSettings, readMeterSettings } from './meter-settings-values';
import { applyMeterSourceDefaults } from './meter-source-defaults';

describe('Meter settings values', () => {
  it.each([12345, '0012345', 'A-00123'])('preserves account identifier %s and disabled setup values through mapping', accountNumber => {
    const saved = meter({ accountNumber, source: 'Natural Gas', startingUnit: 'DTherms', energyUnit: 'DTherms', scope: 1, greenPurchaseFraction: 0.25 });
    const values = readMeterSettings(saved);
    expect(normalizeMeterSettings(values)).toEqual(values);
    expect(values.greenPurchaseFraction).toBe(25);
    const updated = applyMeterSettings({ ...saved, displayEnergyUnit: 'GJ' }, { ...values, name: 'Renamed' });
    expect(updated).toMatchObject({ accountNumber, name: 'Renamed', startingUnit: 'DTherms', displayEnergyUnit: 'GJ', greenPurchaseFraction: 0.25 });
    expect(saved.name).not.toBe('Renamed');
  });

  it('merges metadata and GUID-matched charge changes independently', () => {
    const base = readMeterSettings(meter({ notes: 'Before', charges: [{ guid: 'charge-a', name: 'Usage', chargeType: 'consumption', displayChargeInTable: true, displayUsageInTable: true }] }));
    const local = { ...base, name: 'My meter', chargesArray: base.chargesArray.map(charge => ({ ...charge, name: 'My charge' })) };
    const saved = { ...base, notes: 'Saved note', chargesArray: base.chargesArray.map(charge => ({ ...charge, displayUsageInTable: false })) };
    const merged = reconcileMeterSettings(base, local, saved);
    expect(merged.conflicts).toEqual([]);
    expect(merged.value).toMatchObject({ name: 'My meter', notes: 'Saved note', chargesArray: [{ name: 'My charge', displayUsageInTable: false }] });
  });

  it('preserves a group GUID through form values and maps Ungrouped back to the existing stored format', () => {
    const saved = meter({ groupId: 'energy-group-guid' });
    const values = readMeterSettings(saved);
    expect(values.groupId).toBe('energy-group-guid');
    expect(applyMeterSettings(saved, { ...values, name: 'Renamed' }).groupId).toBe('energy-group-guid');
    expect(applyMeterSettings(saved, { ...values, groupId: 'water-group-guid' }).groupId).toBe('water-group-guid');
    expect(applyMeterSettings(saved, { ...values, groupId: null }).groupId).toBeUndefined();
    expect(readMeterSettings(meter({ groupId: undefined })).groupId).toBeNull();
    expect(readMeterSettings(meter({ groupId: '' })).groupId).toBeNull();
  });

  it('merges a saved group reassignment with independent local metadata', () => {
    const base = readMeterSettings(meter({ groupId: 'energy-a' }));
    const merged = reconcileMeterSettings(base, { ...base, name: 'Local name' }, { ...base, groupId: 'energy-b' });
    expect(merged.conflicts).toEqual([]);
    expect(merged.value).toMatchObject({ name: 'Local name', groupId: 'energy-b' });
  });

  it('reviews source and group as one setup when a saved reassignment overlaps a source change', () => {
    const base = readMeterSettings(meter({ groupId: 'energy-a' }));
    const local = { ...base, source: 'Water Intake' as const, startingUnit: 'gal', groupId: 'water-a' };
    const saved = { ...base, groupId: 'energy-b' };
    expect(reconcileMeterSettings(base, local, saved).conflicts.map(conflict => conflict.id)).toEqual(['setup']);
    const useLocal = reconcileMeterSettings(base, local, saved, { setup: 'local' });
    expect(useLocal.conflicts).toEqual([]);
    expect(useLocal.value).toMatchObject({ source: 'Water Intake', startingUnit: 'gal', groupId: 'water-a' });
    const useSaved = reconcileMeterSettings(base, local, saved, { setup: 'saved' });
    expect(useSaved.value).toMatchObject({ source: base.source, startingUnit: base.startingUnit, groupId: 'energy-b' });
  });

  it('requires a choice for coupled meter setup instead of mixing units and source', () => {
    const base = readMeterSettings(meter({}));
    const local = { ...base, source: 'Natural Gas' as const, startingUnit: 'SCF' };
    const saved = { ...base, energyUnit: 'GJ' };
    const result = reconcileMeterSettings(base, local, saved);
    expect(result.conflicts.map(conflict => conflict.id)).toContain('setup');
    const resolved = reconcileMeterSettings(base, local, saved, { setup: 'saved' });
    expect(resolved.conflicts).toEqual([]);
    expect(resolved.value.source).toBe(base.source);
    expect(resolved.value.energyUnit).toBe('GJ');
  });
});

describe('Explicit new meter defaults', () => {
  const settings = facility({ energyUnit: 'MMBtu', electricityUnit: 'kWh', volumeGasUnit: 'SCF', volumeLiquidUnit: 'gal', massUnit: 'lb' });
  it.each([
    ['Electricity', 3, 'kWh'], ['Natural Gas', 1, 'SCF'], ['Other Fuels', 1, 'SCF'],
    ['Other Energy', 4, 'lb'], ['Water Intake', undefined, 'gal'], ['Water Discharge', undefined, 'gal'], ['Other', 100, 'lb']
  ] as const)('sets source-specific defaults for %s before creation is persisted', (source, scope, startingUnit) => {
    const updated = applyMeterSourceDefaults(meter({ source }), settings);
    expect(updated).toMatchObject({ source, scope, startingUnit });
    if (source !== 'Electricity') expect(updated.energyUnit).toBe('MMBtu');
  });
});
