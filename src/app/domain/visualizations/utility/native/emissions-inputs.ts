import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { GlobalWarmingPotentials } from '@data/models/globalWarmingPotentials';
import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import type { EmissionsRate, SubregionEmissions } from '@data/models/eGridEmissions';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { getEmissionsRate } from '@domain/calculations/emissions-calculations/emissions';
import { getFuelTypeOptions, getMobileFuelTypes } from '@shared/fuel-options/getFuelTypeOptions';

/** Validate saved inputs that canonical calculations may otherwise replace with zero or default factors. */
export interface UtilityEmissionsEvidence {
  readonly measure: 'location-emissions' | 'market-emissions';
  /** Calendarized allocations select rates for their actual output year, which can differ from a contributing bill year. */
  readonly year?: number;
  readonly emissionsRates?: readonly SubregionEmissions[];
}

export function utilityNeedsGridRates(meter: IdbUtilityMeter): boolean {
  return meter.source === 'Electricity' || meter.source === 'Other Energy' && meter.fuel === 'Purchased Compressed Air';
}

export function utilityEmissionsInputError(snapshot: AccountWorkspaceSnapshot, meter: IdbUtilityMeter, readings: readonly IdbUtilityMeterData[],
  evidence?: UtilityEmissionsEvidence): string | undefined {
  if (!['AR4', 'AR5', 'AR6'].includes(snapshot.account.assessmentReportVersion)) return 'Select a supported saved emissions assessment version.';
  if (meter.source !== 'Other' && !(meter.source === 'Other Fuels' && meter.scope === 2)) {
    const target = meter.source === 'Electricity' || meter.source === 'Other Energy' && meter.fuel === 'Purchased Compressed Air' ? 'kWh' : 'MMBtu';
    const conversion = new ConvertValue(1, meter.energyUnit, target);
    if (conversion.hasError || !Number.isFinite(conversion.convertedValue)) return 'Invalid saved energy unit for emissions calculation.';
  }
  if (utilityNeedsGridRates(meter)) {
    const compressedAir = meter.source === 'Other Energy';
    const market = evidence?.measure === 'market-emissions';
    const multipliers = compressedAir ? [meter.locationGHGMultiplier, ...(market ? [meter.recsMultiplier] : [])]
      : market ? [meter.marketGHGMultiplier, meter.recsMultiplier] : [meter.locationGHGMultiplier];
    if (!multipliers.every(Number.isFinite)) return 'Missing or invalid saved emissions multipliers.';
    const subregion = snapshot.facilities.find(facility => facility.guid === meter.facilityId)?.eGridSubregion;
    if (!subregion) return 'Missing facility emissions subregion.';
    const catalog: readonly SubregionEmissions[] = evidence?.emissionsRates ?? snapshot.customEmissions;
    const region = catalog.find(item => item.subregion === subregion);
    if (!region) return 'No emissions rate coverage exists for the saved facility subregion.';
    if (!Array.isArray(region.locationEmissionRates) || !Array.isArray(region.residualEmissionRates)
      || region.directEmissionsRate !== undefined && typeof region.directEmissionsRate !== 'boolean') return 'Invalid saved emissions rate catalog.';
    const years = evidence?.year === undefined ? [...new Set(readings.map(reading => reading.year))] : [evidence.year];
    if (!years.length || years.some(year => !Number.isInteger(year) || year < 1 || year > 9999)) return 'Missing or invalid emissions observation year.';
    const needLocation = !market || compressedAir;
    // Compressed-air scope-2 totals use location rates; only a possible market REC deduction additionally needs residual rates.
    const compressedAirExcessRECs = readings.some(reading => reading.totalEnergyUse * meter.recsMultiplier
      - (meter.includeInEnergy ? reading.totalEnergyUse : 0) > 0);
    const needResidual = market && (!compressedAir || compressedAirExcessRECs);
    for (const year of years) {
      const selected = getEmissionsRate(subregion, year, [...catalog]);
      const required = [
        ...(needLocation ? [{ name: 'location', entries: region.locationEmissionRates, rate: selected.locationRate }] : []),
        ...(needResidual ? [{ name: 'residual', entries: region.residualEmissionRates, rate: selected.marketRate }] : [])
      ];
      for (const item of required) {
        if (!item.entries.length || !item.rate || !item.entries.includes(item.rate)) return `Missing ${item.name} emissions rate coverage for ${subregion} in ${year}.`;
        if (!validRate(item.rate, selected.directEmissionsRate)) return `Invalid ${item.name} emissions coefficient or year for ${subregion} in ${year}.`;
      }
    }
  }
  if (meter.source === 'Other') {
    const gwp = [...GlobalWarmingPotentials, ...snapshot.customGWPs].find(option => option.value === meter.globalWarmingPotentialOption);
    if (!gwp) return 'Missing or unavailable saved global-warming-potential selection.';
    const factor = snapshot.account.assessmentReportVersion === 'AR6' ? gwp.gwp_ar6 : snapshot.account.assessmentReportVersion === 'AR5' ? gwp.gwp_ar5 : gwp.gwp_ar4;
    const conversion = new ConvertValue(1, 'kg', meter.startingUnit);
    if (!Number.isFinite(factor) || conversion.hasError) return 'Invalid saved global-warming-potential factor or mass unit.';
    if (readings.some(reading => typeof reading.totalVolume !== 'number' || !Number.isFinite(reading.totalVolume))) return 'Missing saved process or fugitive consumption inputs.';
  }
  if (meter.source === 'Other Fuels' && meter.scope === 2) {
    const fuel = getMobileFuelTypes(meter.vehicleCategory, meter.vehicleType, [...snapshot.customFuels]).find(item => item.value === meter.vehicleFuel);
    if (!fuel || !readings.length || readings.some(reading => typeof reading.totalVolume !== 'number' || !Number.isFinite(reading.totalVolume))) return 'Missing saved mobile fuel or consumption inputs.';
    if (meter.vehicleCategory === 2 && readings.some(reading => !Number.isFinite(reading.vehicleFuelEfficiency) || reading.vehicleFuelEfficiency <= 0)) return 'Missing or invalid saved vehicle fuel efficiency.';
    const consumption = meter.vehicleCategory !== 2 || meter.vehicleCollectionType === 1;
    const conversion = new ConvertValue(1, consumption ? meter.vehicleCollectionUnit : meter.vehicleDistanceUnit, consumption ? 'gal' : 'mi');
    if (conversion.hasError || !Number.isFinite(conversion.convertedValue)) return 'Invalid saved mobile emissions consumption unit.';
  } else if (meter.source === 'Other Fuels' || meter.source === 'Other Energy') {
    const fuel = getFuelTypeOptions(meter.source, meter.phase, [...snapshot.customFuels], meter.scope, meter.vehicleCategory, meter.vehicleType)?.find(item => item.value === meter.fuel);
    if (!fuel) return 'Missing or unavailable saved emissions fuel selection.';
  }
  return undefined;
}

function validRate(rate: EmissionsRate, direct: boolean): boolean {
  return Number.isInteger(rate.year) && rate.year > 0 && rate.year <= 9999
    && (direct ? Number.isFinite(rate.co2Emissions) : [rate.CO2, rate.CH4, rate.N2O].every(Number.isFinite));
}
