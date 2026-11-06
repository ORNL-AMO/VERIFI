import { MeterSource } from '@data/models/constantsAndTypes';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getChargeTypes } from '@data/models/meter-charges-options';
import { getFuelTypeOptions } from '@shared/fuel-options/getFuelTypeOptions';
import { StationaryOtherEnergyOptions } from '@shared/fuel-options/stationaryOtherEnergyOptions';
import { checkShowHeatCapacity, checkShowSiteToSource, getHeatingCapacity, getSiteToSource } from '@shared/sharedHelperFunctions';
import { EnergyUnitOptions } from '@shared/unitOptions';

export function meterDefaultScope(source: MeterSource): number | undefined {
  return ({ Electricity: 3, 'Other Energy': 4, 'Natural Gas': 1, 'Other Fuels': 1, Other: 100 } as Partial<Record<MeterSource, number>>)[source];
}

export function meterDefaultStartingUnit(meter: Pick<IdbUtilityMeter, 'source' | 'phase' | 'fuel' | 'startingUnit'>, facility: IdbFacility): string {
  if (meter.source === 'Electricity') return facility.electricityUnit;
  else if (meter.source === 'Natural Gas') return facility.volumeGasUnit;
  else if (meter.source === 'Other Fuels') return meter.phase === 'Liquid' ? facility.volumeLiquidUnit : meter.phase === 'Solid' ? facility.massUnit : facility.volumeGasUnit;
  else if (meter.source === 'Other Energy') {
    const kind = StationaryOtherEnergyOptions.find(option => option.value === meter.fuel)?.otherEnergyType;
    if (kind === 'Steam') return facility.massUnit;
    if (kind === 'Chilled Water' || kind === 'Hot Water') return facility.energyUnit;
    if (kind === 'Compressed Air') return facility.volumeGasUnit;
  } else if (meter.source === 'Water Intake' || meter.source === 'Water Discharge') return facility.volumeLiquidUnit;
  else if (meter.source === 'Other') return facility.massUnit;
  return meter.startingUnit;
}

/** Explicit creation/source-transition defaults. Never use this when reading a saved record. */
export function applyMeterSourceDefaults(meter: IdbUtilityMeter, facility: IdbFacility, customFuels: readonly IdbCustomFuel[] = [], startingUnit?: string): IdbUtilityMeter {
  const next = structuredClone(meter);
  next.scope = meterDefaultScope(next.source);
  next.energyUnit = next.source === 'Electricity' ? 'kWh' : facility.energyUnit;
  const fuels = getFuelTypeOptions(next.source, next.phase, [...customFuels], next.scope, next.vehicleCategory, next.vehicleType);
  if (!fuels.some(option => option.value === next.fuel) && fuels.length) next.fuel = fuels[0].value;
  next.startingUnit = startingUnit ?? meterDefaultStartingUnit(next, facility);
  const energyUnit = EnergyUnitOptions.find(option => option.value === next.startingUnit);
  if (energyUnit) next.energyUnit = energyUnit.value;
  const selectedFuel = fuels.find(option => option.value === next.fuel);
  if (checkShowHeatCapacity(next.source, next.startingUnit, next.scope)) next.heatCapacity = getHeatingCapacity(next.source, next.startingUnit, next.energyUnit, selectedFuel);
  next.siteToSource = checkShowSiteToSource(next.source, next.includeInEnergy, next.scope)
    ? getSiteToSource(next.source, selectedFuel, next.agreementType) : 1;
  const chargeTypes = getChargeTypes(next.source);
  next.charges = (next.charges ?? []).map(charge => ({ ...charge,
    chargeType: chargeTypes.some(option => option.value === charge.chargeType) ? charge.chargeType : undefined
  }));
  return next;
}
