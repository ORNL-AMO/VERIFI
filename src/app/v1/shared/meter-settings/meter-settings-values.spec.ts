import { meter, facility } from '@app/v1/data/meters/facility-meters.testing';
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

  it('preserves the latest group assignment while settings do not own group changes', () => {
    const opened = meter({ groupId: 'original-group' });
    const values = readMeterSettings(opened);
    const updated = applyMeterSettings({ ...opened, groupId: 'latest-group' }, { ...values, name: 'Renamed' });
    expect(updated).toMatchObject({ name: 'Renamed', groupId: 'latest-group' });
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
