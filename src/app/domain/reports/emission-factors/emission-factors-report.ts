import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { EmissionsRate, SubregionEmissions } from '@data/models/eGridEmissions';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getEmissionsRate, getFuelEmissionsOutputRate } from '@domain/calculations/emissions-calculations/emissions';
import { getMobileFuelTypes } from '@shared/fuel-options/getFuelTypeOptions';
import { EmissionFactorsPeriod, validEmissionFactorsPeriod } from './emission-factors-period';

export interface EmissionFactorsInput {
  readonly facility: IdbFacility;
  readonly meters: readonly IdbUtilityMeter[];
  readonly startYear: number;
  readonly endYear: number;
  readonly rates: readonly SubregionEmissions[];
  readonly customFuels: readonly IdbCustomFuel[];
}
export interface ElectricityFactorRow {
  readonly year: number;
  readonly marketRate: EmissionsRate;
  readonly locationRate: EmissionsRate;
  readonly directEmissionsRate: boolean;
}
export interface OtherFactorRow {
  readonly meterGuid: string;
  readonly meterName: string;
  readonly source: string;
  readonly fuelValue: string;
  readonly CO2?: number;
  readonly CH4?: number;
  readonly N2O?: number;
  readonly unit: string;
  readonly unavailable?: string;
}
export interface FacilityEmissionFactorsResult {
  readonly facility: Pick<IdbFacility, 'guid' | 'name' | 'zip' | 'eGridSubregion'>;
  readonly electricityMeters: readonly { readonly guid: string; readonly name: string }[];
  readonly electricity: readonly ElectricityFactorRow[];
  readonly other: readonly OtherFactorRow[];
}

/** Account reports retain facility identity and order; reference factors are never aggregated. */
export function buildAccountEmissionFactorsInputs(snapshot: AccountWorkspaceSnapshot,
  period: EmissionFactorsPeriod, rates: readonly SubregionEmissions[]): readonly EmissionFactorsInput[] {
  if (!validEmissionFactorsPeriod(period)) throw new Error('Choose a start year earlier than the end year in Setup.');
  return snapshot.facilities.filter(facility => facility.accountId === snapshot.account.guid)
    .map(facility => buildEmissionFactorsInput(snapshot, facility.guid, period, rates));
}

/** Scope adapters supply a period and catalog; no report type or active selection is implicit. */
export function buildEmissionFactorsInput(snapshot: AccountWorkspaceSnapshot, facilityGuid: string,
  period: EmissionFactorsPeriod, rates: readonly SubregionEmissions[]): EmissionFactorsInput {
  const facility = snapshot.facilities.find(item => item.guid === facilityGuid && item.accountId === snapshot.account.guid);
  if (!facility) throw new Error('The report facility is unavailable. Return to Setup.');
  if (!validEmissionFactorsPeriod(period)) throw new Error('Choose a start year earlier than the end year in Setup.');
  return structuredClone({ facility,
    meters: snapshot.meters.filter(item => item.accountId === snapshot.account.guid && item.facilityId === facilityGuid),
    startYear: period.startYear!, endYear: period.endYear!, rates, customFuels: snapshot.customFuels });
}

/** Preserve legacy factor lookups and unit conventions; these are reference factors, not emissions totals. */
export function calculateEmissionFactors(input: EmissionFactorsInput): FacilityEmissionFactorsResult {
  if (!validEmissionFactorsPeriod(input)) throw new Error('Choose a start year earlier than the end year in Setup.');
  const { facility, meters } = input;
  const electricityMeters = meters.filter(meter => meter.source === 'Electricity').map(meter => ({ guid: meter.guid, name: meter.name }));
  const electricity: ElectricityFactorRow[] = [];
  if (electricityMeters.length) {
    for (let year = input.startYear; year <= input.endYear; year++) {
      electricity.push({ year, ...getEmissionsRate(facility.eGridSubregion, year, [...input.rates]) });
    }
  }
  const other: OtherFactorRow[] = [];
  for (const meter of meters) {
    if (meter.source === 'Other Fuels' && meter.scope === 2) {
      const fuel = getMobileFuelTypes(meter.vehicleCategory, meter.vehicleType, [...input.customFuels])
        .find(option => option.value === meter.vehicleFuel);
      other.push({ meterGuid: meter.guid, meterName: meter.name, source: meter.source,
        fuelValue: fuel?.value ?? meter.vehicleFuel ?? '', CO2: fuel?.CO2, CH4: fuel?.CH4, N2O: fuel?.N2O,
        unit: fuel?.isOnRoad ? meter.vehicleDistanceUnit : meter.vehicleCollectionUnit,
        ...(!fuel ? { unavailable: 'The selected mobile fuel is unavailable. Review this meter’s fuel settings.' } : {}) });
    } else if (meter.source === 'Natural Gas' || meter.source === 'Other Energy'
      || (meter.source === 'Other Fuels' && meter.scope !== 2)) {
      const rate = getFuelEmissionsOutputRate(meter.source, meter.fuel, meter.phase, [...input.customFuels],
        meter.scope, meter.vehicleCategory, meter.vehicleType);
      other.push({ meterGuid: meter.guid, meterName: meter.name, source: meter.source, fuelValue: meter.fuel || '',
        CO2: rate.CO2, CH4: rate.CH4, N2O: rate.N2O,
        unit: meter.source === 'Other Fuels' ? meter.vehicleCollectionUnit : meter.energyUnit });
    }
  }
  return structuredClone({ facility: { guid: facility.guid, name: facility.name, zip: facility.zip, eGridSubregion: facility.eGridSubregion },
    electricityMeters, electricity, other });
}
