import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { getZeroEmissionsResults } from '@domain/calculations/emissions-calculations/emissions';
import { buildDataQualityAnnualTotals } from './data-quality-report-annual-totals';

function meter(overrides: Partial<CalanderizedMeter> = {}): CalanderizedMeter {
  return { meter: { source: 'Natural Gas', scope: 1 } as CalanderizedMeter['meter'], consumptionUnit: 'SCF', energyUnit: 'MMBtu',
    energyIsSource: false, showEnergyUse: true, showConsumption: false, showElectricalEmissions: false,
    showOtherScope2Emissions: false, showStationaryEmissions: false, showMobileEmissions: false,
    showFugitiveEmissions: false, showProcessEmissions: false, monthlyData: [], ...overrides };
}
function month(year: number, consumption: number, energy: number, cost: number): MonthlyData {
  return { ...getZeroEmissionsResults(), year, fiscalYear: year + 1, energyConsumption: consumption, energyUse: energy, energyCost: cost } as MonthlyData;
}
describe('Data Quality annual totals', () => {
  it('sums unrounded calendar years, coercing missing/invalid values as v0 does, without mutating months', () => {
    const input = meter({ monthlyData: [month(2024, 10, .1234567, 4.5), month(2023, 20, 3, 8), month(2024, 30, .2345678, NaN)] });
    input.monthlyData[2].stationaryEmissions = 2.25;
    input.monthlyData[0].stationaryEmissions = '1.5' as unknown as number;
    const original = structuredClone(input);
    const result = buildDataQualityAnnualTotals(input, true);
    expect(result.rows.map(row => row.year)).toEqual([2023, 2024]);
    expect(result.rows[1]).toMatchObject({ energyConsumption: 40, energyUse: .1234567 + .2345678, energyCost: 4.5, stationaryEmissions: 3.75 });
    expect(input).toEqual(original);
    expect(result.columns.map(column => column.key)).toEqual(['year', 'energyConsumption', 'energyUse', 'energyCost']);
  });
  it.each([
    ['showElectricalEmissions', ['totalWithMarketEmissions', 'totalWithLocationEmissions']],
    ['showStationaryEmissions', ['stationaryBiogenicEmmissions', 'stationaryCarbonEmissions', 'stationaryOtherEmissions', 'stationaryEmissions']],
    ['showOtherScope2Emissions', ['otherScope2Emissions']],
    ['showMobileEmissions', ['mobileBiogenicEmissions', 'mobileCarbonEmissions', 'mobileOtherEmissions', 'mobileTotalEmissions']],
    ['showFugitiveEmissions', ['fugitiveEmissions']], ['showProcessEmissions', ['processEmissions']]
  ] as const)('includes exactly the applicable %s columns and respects Other Impacts', (flag, keys) => {
    const input = meter({ [flag]: true });
    expect(buildDataQualityAnnualTotals(input, true).columns.map(column => column.key)).toEqual(['year', 'energyUse', ...keys, 'energyCost']);
    expect(buildDataQualityAnnualTotals(input, false).columns.map(column => column.key)).toEqual(['year', 'energyUse', 'energyCost']);
  });
  it.each([4, 6])('uses REC columns for agreement %s and hides energy, including when Other Impacts is off', agreementType => {
    const input = meter({ meter: { source: 'Electricity', agreementType } as CalanderizedMeter['meter'], showElectricalEmissions: true });
    expect(buildDataQualityAnnualTotals(input, true).columns.map(column => column.key)).toEqual(['year', 'RECs', 'excessRECs', 'excessRECsEmissions', 'energyCost']);
    expect(buildDataQualityAnnualTotals(input, false).columns.map(column => column.key)).toEqual(['year', 'energyCost']);
  });
  it('derives consumption visibility after projection, labels distance, and supports nonenergy and empty meters', () => {
    const input = meter({ showConsumption: true, monthlyData: [month(2024, 10, 10, 0)] });
    expect(buildDataQualityAnnualTotals(input, false).columns.map(column => column.key)).not.toContain('energyConsumption');
    input.meter.scope = 2; input.monthlyData[0].energyUse = 1;
    expect(buildDataQualityAnnualTotals(input, false).columns[1].label).toBe('Total Distance');
    input.showEnergyUse = false;
    expect(buildDataQualityAnnualTotals(input, false).columns.map(column => column.key)).toEqual(['year', 'energyConsumption', 'energyCost']);
    expect(buildDataQualityAnnualTotals(meter(), false).rows).toEqual([]);
  });
});
