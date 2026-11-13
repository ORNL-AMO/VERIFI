import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import type { EmissionsRate, SubregionEmissions } from '@data/models/eGridEmissions';
import { utilityEmissionsInputError, utilityNeedsGridRates } from './emissions-inputs';

describe('actual emissions input coverage', () => {
  const zero: EmissionsRate = { year: 2026, CO2: 0, CH4: 0, N2O: 0, co2Emissions: 0 };
  const snapshot = { ...visualizationSnapshot(), customEmissions: [], facilities: visualizationSnapshot().facilities.map(item => ({ ...item, eGridSubregion: 'AKGD' })) };
  const selected = meter({});
  function region(location: EmissionsRate[] = [zero], residual: EmissionsRate[] = [zero], direct = false): SubregionEmissions {
    return { subregion: 'AKGD', locationEmissionRates: location, residualEmissionRates: residual, directEmissionsRate: direct };
  }
  function error(measure: 'location-emissions' | 'market-emissions', rates: readonly SubregionEmissions[], selectedMeter = selected, year = 2026) {
    return utilityEmissionsInputError(snapshot, selectedMeter, [reading({})], { measure, year, emissionsRates: rates });
  }
  it('requests grid factors only for electricity and purchased compressed air', () => {
    expect(utilityNeedsGridRates(selected)).toBe(true);
    expect(utilityNeedsGridRates(meter({ source: 'Other Energy', fuel: 'Purchased Compressed Air' }))).toBe(true);
    for (const item of [meter({ source: 'Natural Gas' }), meter({ source: 'Other', scope: 5 }), meter({ source: 'Other Energy', fuel: 'Purchased Steam' })]) expect(utilityNeedsGridRates(item)).toBe(false);
  });
  it.each(['location-emissions', 'market-emissions'] as const)('rejects unknown/absent %s catalogs instead of accepting canonical fallback zeros', measure => {
    expect(error(measure, [])).toContain('coverage');
    expect(error(measure, [{ ...region(), subregion: 'unknown' }])).toContain('coverage');
    expect(error(measure, [region([], [])])).toContain('coverage');
  });
  it('requires the rate array actually used by the requested total', () => {
    expect(error('location-emissions', [region([zero], [])])).toBeUndefined();
    expect(error('location-emissions', [region([], [zero])])).toContain('location');
    expect(error('market-emissions', [region([], [zero])])).toBeUndefined();
    expect(error('market-emissions', [region([zero], [])])).toContain('residual');
    const compressed = meter({ source: 'Other Energy', fuel: 'Purchased Compressed Air' });
    expect(error('location-emissions', [region([zero], [])], compressed)).toBeUndefined();
    expect(error('market-emissions', [region([zero], [])], compressed)).toBeUndefined();
    expect(error('market-emissions', [region([zero], [])], { ...compressed, recsMultiplier: 2 })).toContain('residual');
  });
  it('uses canonical closest-year selection and the actual allocation year', () => {
    const rates = [region([{ ...zero, year: 2024 }, { ...zero, year: 2026, CO2: NaN }])];
    expect(error('location-emissions', rates, selected, 2024)).toBeUndefined();
    expect(error('location-emissions', rates, selected, 2026)).toContain('coefficient');
    expect(error('location-emissions', [region([{ ...zero, year: 2026.5 }])])).toContain('year');
    expect(error('location-emissions', [region()], selected, NaN)).toContain('year');
  });
  it('accepts explicit zero factors and checks direct factors independently of unused coefficients', () => {
    expect(error('location-emissions', [region()])).toBeUndefined();
    const direct = { ...zero, CO2: NaN, CH4: NaN, N2O: NaN, co2Emissions: 0 };
    expect(error('location-emissions', [region([direct], [direct], true)])).toBeUndefined();
    expect(error('location-emissions', [region([{ ...direct, co2Emissions: undefined }], [direct], true)])).toContain('coefficient');
    expect(error('location-emissions', [region([{ ...zero, CH4: undefined }])])).toContain('coefficient');
  });
  it('requires only multipliers used by the selected output', () => {
    expect(error('location-emissions', [region()], { ...selected, marketGHGMultiplier: undefined, recsMultiplier: undefined })).toBeUndefined();
    expect(error('market-emissions', [region()], { ...selected, locationGHGMultiplier: undefined })).toBeUndefined();
    expect(error('location-emissions', [region()], { ...selected, locationGHGMultiplier: undefined })).toContain('multipliers');
    expect(error('market-emissions', [region()], { ...selected, recsMultiplier: undefined })).toContain('multipliers');
  });
});
