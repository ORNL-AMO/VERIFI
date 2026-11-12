import { meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { utilityVisualizationFixture } from '../testing/visualization-fixtures';
import type { UtilityVisualizationSource } from '../visualization-definition';
import { aggregateUtilityObservations, calendarizedObservation, unavailableObservation, utilityInputField, utilityInputUnitError } from './utility-quality';

describe('utility observation quality', () => {
  const source = { ...utilityVisualizationFixture().sources[0], measure: 'cost' } as UtilityVisualizationSource;
  const selectedMeter = meter({ meterReadingDataApplication: 'fullMonth' });
  it.each([undefined, NaN, Infinity])('does not treat normalized %s cost as an actual zero', value => {
    expect(calendarizedObservation(selectedMeter, [reading({ totalCost: value })], source, 2026, 0, 0)).toMatchObject({ state: 'missing', value: null });
  });
  it('preserves real zero and estimated provenance', () => {
    expect(calendarizedObservation(selectedMeter, [reading({ totalCost: 0, isEstimated: true })], source, 2026, 0, 0))
      .toEqual({ state: 'observed', value: 0, provenance: 'estimated', partial: false });
  });
  it.each(['location-emissions', 'market-emissions'] as const)('validates the actual source-specific %s input rather than an unrelated energy field', measure => {
    const emissionsSource = { ...source, measure };
    for (const selected of [meter({ source: 'Other', scope: 5, startingUnit: 'kg' }), meter({ source: 'Other', scope: 6, startingUnit: 'kg' }),
      meter({ source: 'Other Fuels', scope: 2, startingUnit: 'gal', vehicleCollectionUnit: 'gal', vehicleCollectionType: 1, vehicleCategory: 1 })]) {
      expect(utilityInputField(emissionsSource, selected)).toBe('totalVolume');
      expect(calendarizedObservation({ ...selected, meterReadingDataApplication: 'fullMonth' }, [reading({ totalEnergyUse: undefined, totalVolume: 0, isEstimated: true })], emissionsSource, 2026, 0, 0))
        .toEqual({ state: 'observed', value: 0, provenance: 'estimated', partial: false });
      for (const invalid of [undefined, NaN, Infinity]) expect(calendarizedObservation({ ...selected, meterReadingDataApplication: 'fullMonth' }, [reading({ totalEnergyUse: 10, totalVolume: invalid })], emissionsSource, 2026, 0, 0))
        .toMatchObject({ state: 'missing', value: null, reason: expect.stringContaining('totalVolume') });
    }
    expect(utilityInputField(emissionsSource, meter({ source: 'Electricity' }))).toBe('totalEnergyUse');
    expect(utilityInputField(emissionsSource, meter({ source: 'Natural Gas' }))).toBe('totalEnergyUse');
    expect(utilityInputField(emissionsSource, meter({ source: 'Other Energy', fuel: 'Purchased Steam' }))).toBe('totalEnergyUse');
  });
  it('rejects invalid saved-to-canonical and saved-to-projected units independently of finite computed values', () => {
    const energy = { ...source, measure: 'energy' as const };
    const invalidEnergy = meter({ energyUnit: 'invalid-unit', meterReadingDataApplication: 'fullMonth' });
    expect(utilityInputUnitError(energy, invalidEnergy, 'kWh')).toContain('Invalid');
    expect(calendarizedObservation(invalidEnergy, [reading({ totalEnergyUse: 10 })], energy, 2026, 0, 2930.722)).toMatchObject({ state: 'missing', reason: expect.stringContaining('unit') });
    expect(calendarizedObservation(invalidEnergy, [reading({ totalCost: 20 })], source, 2026, 0, 20)).toMatchObject({ state: 'observed', value: 20 });
    const consumption = { ...source, measure: 'consumption' as const };
    expect(utilityInputUnitError(consumption, meter({ source: 'Water Intake', startingUnit: 'invalid-unit' }), 'gal')).toContain('Invalid');
    expect(utilityInputUnitError(consumption, meter({ source: 'Other', startingUnit: 'kg' }), 'gal')).toContain('incompatible');
    expect(utilityInputUnitError(consumption, meter({ source: 'Other Fuels', scope: 2, startingUnit: 'gal', vehicleCollectionUnit: 'invalid-unit', vehicleCollectionType: 1 }), 'gal')).toContain('Invalid');
    expect(utilityInputUnitError(consumption, meter({ source: 'Water Intake', startingUnit: 'gal', energyUnit: 'invalid-unit' }), 'gal')).toBeUndefined();
  });
  it('distinguishes missing, duplicate, and retired observations', () => {
    expect(calendarizedObservation(selectedMeter, [], source, 2026, 0, 0)).toMatchObject({ state: 'missing' });
    expect(calendarizedObservation(selectedMeter, [reading({}), reading({ guid: 'duplicate' })], source, 2026, 0, 20)).toMatchObject({ state: 'missing', reason: expect.stringContaining('Duplicate') });
    expect(calendarizedObservation({ ...selectedMeter, noLongerInUse: true, noLongerInUseYear: 2025, noLongerInUseMonth: 11 }, [reading({})], source, 2026, 0, 0)).toMatchObject({ state: 'excluded', reason: expect.stringContaining('Retired') });
  });
  it('qualifies isolated valid subtotals and does not fabricate all-missing zero', () => {
    const value = { state: 'observed' as const, value: 10, provenance: 'measured' as const, partial: false };
    expect(aggregateUtilityObservations([value, unavailableObservation('Invalid bill')])).toEqual({ ...value, partial: true });
    expect(aggregateUtilityObservations([unavailableObservation('Missing bill')])).toMatchObject({ state: 'missing', value: null });
    expect(aggregateUtilityObservations([value, unavailableObservation('Retired', 'excluded')])).toEqual(value);
    expect(aggregateUtilityObservations([unavailableObservation('Retired', 'excluded')])).toMatchObject({ state: 'excluded', value: null });
  });
});
