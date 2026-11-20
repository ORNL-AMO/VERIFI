import { getFuelEmissionsOutputRate } from '@domain/calculations/emissions-calculations/emissions';
import { getMobileFuelTypes } from '@shared/fuel-options/getFuelTypeOptions';
import { emissionFactorsRates, emissionFactorsSnapshot } from '../testing/emission-factors-fixtures';
import { buildEmissionFactorsInput, calculateEmissionFactors } from './emission-factors-report';
import { validEmissionFactorYear, validEmissionFactorsPeriod } from './emission-factors-period';
import { getFacilityReportErrors } from '@domain/calculations/status-check-calculations/validation/facilityReportValidation';
import { getNewAccountEmissionsItem } from '@data/models/idbModels/customEmissions';

describe('shared emission-factor report calculations', () => {
  it('returns one ascending inclusive electricity row per year with existing nearest-year ties and full precision', () => {
    const snapshot = emissionFactorsSnapshot(), rates = emissionFactorsRates();
    snapshot.meters.push({ ...snapshot.meters[0], id: 7, guid: 'electricity-2', name: 'Second electricity' });
    snapshot.customEmissions = [{ ...getNewAccountEmissionsItem('account'), subregion: 'TEST', locationEmissionRates: [{ year: 2022, CO2: 999, CH4: 0, N2O: 0, co2Emissions: 999 }],
      residualEmissionRates: [] }];
    const before = structuredClone(snapshot);
    const input = buildEmissionFactorsInput(snapshot, 'facility', { startYear: 2022, endYear: 2024 }, [...rates, ...snapshot.customEmissions]);
    const result = calculateEmissionFactors(input);
    expect(result.electricity.map(row => row.year)).toEqual([2022, 2023, 2024]);
    expect(result.electricity[0].locationRate).toMatchObject({ year: 2020, CO2: 100.123456 });
    expect(result.electricity[1].locationRate.CO2).toBe(200);
    expect(result.electricity[0].marketRate.CO2).toBe(300);
    expect(result.electricityMeters).toHaveLength(2);
    expect(calculateEmissionFactors(input)).toEqual(result);
    expect(snapshot).toEqual(before);
    result.electricity[0].locationRate.CO2 = -1;
    expect(input.rates[0].locationEmissionRates[0].CO2).toBe(100.123456);
  });
  it('retains zero fallback and direct custom-rate metadata without inventing gas factors', () => {
    const snapshot = emissionFactorsSnapshot(), rates = emissionFactorsRates();
    const missing = calculateEmissionFactors(buildEmissionFactorsInput(snapshot, 'facility', { startYear: 2022, endYear: 2023 }, []));
    expect(missing.electricity[0].marketRate.CO2).toBe(0);
    rates[0].directEmissionsRate = true;
    rates[0].residualEmissionRates = [];
    const result = calculateEmissionFactors(buildEmissionFactorsInput(snapshot, 'facility', { startYear: 2022, endYear: 2023 }, rates));
    expect(result.electricity[0].directEmissionsRate).toBe(true);
    expect(result.electricity[0].marketRate).toMatchObject({ CO2: 0, CH4: 0, N2O: 0 });
  });
  it.each(['Natural Gas', 'Other Fuels', 'Other Energy'] as const)('preserves authoritative stationary %s factors and legacy units', source => {
    const snapshot = emissionFactorsSnapshot(), meter = snapshot.meters[1];
    Object.assign(meter, { source, scope: 1, phase: 'Gas', fuel: '', energyUnit: 'kWh', vehicleCollectionUnit: 'gal' });
    const rate = getFuelEmissionsOutputRate(source, meter.fuel, meter.phase, snapshot.customFuels, meter.scope, meter.vehicleCategory, meter.vehicleType);
    const result = calculateEmissionFactors(buildEmissionFactorsInput(snapshot, 'facility', { startYear: 2022, endYear: 2023 }, []));
    expect(result.other[0]).toMatchObject({ source, CO2: rate.CO2, CH4: rate.CH4, N2O: rate.N2O,
      unit: source === 'Other Fuels' ? 'gal' : 'kWh' });
  });
  it.each([[2, true, 'Custom road', 'mi'], [1, false, 'Custom offroad', 'gal']] as const)(
    'uses on-road/off-road factor definitions and units for category %s', (vehicleCategory, isOnRoad, vehicleFuel, unit) => {
      const snapshot = emissionFactorsSnapshot(), meter = snapshot.meters[1];
      Object.assign(meter, { source: 'Other Fuels', scope: 2, vehicleCategory, vehicleFuel, vehicleCollectionUnit: 'gal', vehicleDistanceUnit: 'mi' });
      const fuel = getMobileFuelTypes(vehicleCategory, meter.vehicleType, snapshot.customFuels).find(option => option.value === vehicleFuel)!;
      expect(fuel.isOnRoad).toBe(isOnRoad);
      const result = calculateEmissionFactors(buildEmissionFactorsInput(snapshot, 'facility', { startYear: 2022, endYear: 2024 }, []));
      expect(result.other[0]).toMatchObject({ unit, fuelValue: vehicleFuel, CO2: fuel.CO2, CH4: fuel.CH4, N2O: fuel.N2O });
    });
  it('handles removed mobile fuels while retaining the meter and other applicable rows', () => {
    const snapshot = emissionFactorsSnapshot();
    snapshot.meters.push({ ...snapshot.meters[1], guid: 'removed-mobile', source: 'Other Fuels', scope: 2, vehicleFuel: 'Removed' });
    const result = calculateEmissionFactors(buildEmissionFactorsInput(snapshot, 'facility', { startYear: 2022, endYear: 2024 }, []));
    expect(result.other).toHaveLength(2);
    expect(result.other[1]).toMatchObject({ fuelValue: 'Removed', CO2: undefined, unavailable: expect.stringContaining('unavailable') });
  });
  it('isolates facility ownership, omits unsupported sources, and returns detached inputs', () => {
    const snapshot = emissionFactorsSnapshot();
    snapshot.meters.push({ ...snapshot.meters[0], guid: 'foreign', facilityId: 'elsewhere' },
      { ...snapshot.meters[0], guid: 'wrong-account', accountId: 'elsewhere' });
    const input = buildEmissionFactorsInput(snapshot, 'facility', { startYear: 2022, endYear: 2023 }, []);
    expect(input.meters.map(meter => meter.guid)).toEqual(['meter', 'gas']);
    input.facility.name = 'Detached'; expect(snapshot.facilities[0].name).toBe('Plant A');
    expect(() => buildEmissionFactorsInput(snapshot, 'elsewhere', input, [])).toThrow('unavailable');
    snapshot.meters = [{ ...snapshot.meters[0], source: 'Water Intake' }];
    expect(calculateEmissionFactors(buildEmissionFactorsInput(snapshot, 'facility', input, [])).other).toEqual([]);
  });
  it.each([undefined, null, NaN, Infinity, 2022.5, 1799, 10000, '2022'])('rejects unsupported year %s in setup and status', year => {
    expect(validEmissionFactorYear(year)).toBe(false);
    const report = emissionFactorsSnapshot().facilityReports[0];
    report.emissionFactorsReportSettings.startYear = year as number;
    expect(getFacilityReportErrors(report, []).missingBaselineYear).toBe(true);
  });
  it.each([[2022, 2022], [2024, 2022]])('rejects equal and reversed periods %s–%s consistently', (startYear, endYear) => {
    const snapshot = emissionFactorsSnapshot(), period = { startYear, endYear };
    snapshot.facilityReports[0].emissionFactorsReportSettings = period;
    expect(validEmissionFactorsPeriod(period)).toBe(false);
    expect(getFacilityReportErrors(snapshot.facilityReports[0], []).invalidDateRange).toBe(true);
    expect(() => buildEmissionFactorsInput(snapshot, 'facility', period, [])).toThrow('earlier');
  });
});
