import { CalanderizedMeter } from '@data/models/calanderization';
import { EmissionsResults } from '@data/models/eGridEmissions';
import { getZeroEmissionsResults } from '@domain/calculations/emissions-calculations/emissions';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { checkShowSiteToSource } from '@shared/sharedHelperFunctions';

export interface DataQualityAnnualTotal extends EmissionsResults {
  year: number;
  energyConsumption: number;
  energyUse: number;
  energyCost: number;
}
export interface DataQualityAnnualColumn {
  readonly key: keyof DataQualityAnnualTotal;
  readonly label: string;
  readonly unit?: string;
}
export interface DataQualityAnnualTotals {
  readonly meterGuid: string;
  readonly columns: readonly DataQualityAnnualColumn[];
  readonly rows: readonly DataQualityAnnualTotal[];
}

/** v0 groups calendarized months by calendar year, retaining precision until display. */
export function buildDataQualityAnnualTotals(meter: CalanderizedMeter, displayEmissions: boolean, emissionsMultiplier = 1): DataQualityAnnualTotals {
  const years = new Map<number, DataQualityAnnualTotal>();
  const emissionsKeys = Object.keys(getZeroEmissionsResults()) as (keyof EmissionsResults)[];
  for (const month of meter.monthlyData) {
    let total = years.get(month.year);
    if (!total) {
      total = { ...getZeroEmissionsResults(), year: month.year, energyConsumption: 0, energyUse: 0, energyCost: 0 };
      years.set(month.year, total);
    }
    for (const key of emissionsKeys) total[key] += Number(month[key] * emissionsMultiplier) || 0;
    for (const key of ['energyConsumption', 'energyUse', 'energyCost'] as const) total[key] += Number(month[key]) || 0;
  }
  const columns: DataQualityAnnualColumn[] = [{ key: 'year', label: 'Year' }];
  const rec = meter.meter.source === 'Electricity' && [4, 6].includes(meter.meter.agreementType);
  // Canonical visibility predates projection: compare values in the facility's units instead.
  const showConsumption = meter.meter.source !== 'Electricity'
    && meter.monthlyData.some(month => month.energyConsumption !== month.energyUse);
  if (showConsumption && !rec) columns.push({ key: 'energyConsumption', label: meter.meter.scope === 2 ? 'Total Distance' : 'Total Consumption', unit: meter.consumptionUnit });
  if (meter.showEnergyUse && !rec) columns.push({ key: 'energyUse', label: 'Total Energy', unit: meter.energyUnit });
  const emissions = (key: keyof EmissionsResults, label: string, unit = 'tonne CO₂e') => columns.push({ key, label, unit });
  if (displayEmissions) {
    if (meter.showElectricalEmissions && !rec) {
      emissions('totalWithMarketEmissions', 'Total Market-Based Emissions');
      emissions('totalWithLocationEmissions', 'Total Location-Based Emissions');
    }
    if (rec) {
      emissions('RECs', 'RECs', 'MWh');
      emissions('excessRECs', 'Excess RECs', 'MWh');
      emissions('excessRECsEmissions', 'Excess RECs Emissions');
    }
    if (meter.showStationaryEmissions) {
      emissions('stationaryBiogenicEmmissions', 'Total Biogenic Emissions');
      emissions('stationaryCarbonEmissions', 'Total Carbon Emissions');
      emissions('stationaryOtherEmissions', 'Total Other Emissions');
      emissions('stationaryEmissions', 'Total Emissions');
    }
    if (meter.showOtherScope2Emissions) emissions('otherScope2Emissions', 'Total Emissions');
    if (meter.showMobileEmissions) {
      emissions('mobileBiogenicEmissions', 'Mobile Biogenic Emissions');
      emissions('mobileCarbonEmissions', 'Mobile Carbon Emissions');
      emissions('mobileOtherEmissions', 'Mobile Other Emissions');
      emissions('mobileTotalEmissions', 'Mobile Total Emissions');
    }
    if (meter.showFugitiveEmissions) emissions('fugitiveEmissions', 'Fugitive Emissions');
    if (meter.showProcessEmissions) emissions('processEmissions', 'Process Emissions');
  }
  columns.push({ key: 'energyCost', label: 'Total Cost' });
  return { meterGuid: meter.meter.guid, columns, rows: [...years.values()].sort((a, b) => a.year - b.year) };
}

/** Preserve direct v0 calendarization's unit/basis treatment without changing the shared site-emissions projection.
 * Emissions are linear in energy or volume; scaling the canonical sums also retains per-reading fuel efficiencies.
 */
export function dataQualityAnnualEmissionsMultiplier(canonical: CalanderizedMeter, projected: CalanderizedMeter): number {
  const meter = projected.meter;
  if ((meter.source === 'Other Fuels' && meter.scope === 2) || meter.source === 'Other') {
    return canonical.consumptionUnit === projected.consumptionUnit ? 1
      : new ConvertValue(1, canonical.consumptionUnit, projected.consumptionUnit).convertedValue;
  }
  let multiplier = projected.energyIsSource && checkShowSiteToSource(meter.source, meter.includeInEnergy, meter.scope)
    ? meter.siteToSource : 1;
  // getEmissions removes source energy for these sources even when convertMeterData did not apply it.
  if (meter.source === 'Electricity' || meter.source === 'Natural Gas' || meter.source === 'Other Fuels'
    || (meter.source === 'Other Energy' && meter.fuel === 'Purchased Compressed Air')) {
    if (projected.energyIsSource && meter.siteToSource !== 0) multiplier /= meter.siteToSource;
  }
  return multiplier;
}
