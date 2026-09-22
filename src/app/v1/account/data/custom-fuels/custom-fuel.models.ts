import { MeterPhase } from '@data/models/constantsAndTypes';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { FuelTypeOption } from '@shared/fuel-options/fuelTypeOption';
import { MobileBusOptions } from '@shared/fuel-options/mobileBusOptions';
import { MobileHeavyDutyTruckOptions } from '@shared/fuel-options/mobileHeavyDutyVehicleOptions';
import { MobileLightDutyTruckOptions } from '@shared/fuel-options/mobileLightDutyTruckOptions';
import { MobileMotorcycleOptions } from '@shared/fuel-options/mobileMotorcycleOptions';
import { MobileOffRoadAgricultureOptions } from '@shared/fuel-options/mobileOffRoadAgricultureOptions';
import { MobileOffRoadConstructionOptions } from '@shared/fuel-options/mobileOffRoadConstructionOptions';
import { MobilePassangerCarOptions } from '@shared/fuel-options/mobilePassangerCarOptions';
import { MobileRailOptions } from '@shared/fuel-options/mobileRailOptions';
import { MobileTransportOnsiteOptions } from '@shared/fuel-options/mobileTransportOnsiteOptions';
import { MobileWaterTransportOptions } from '@shared/fuel-options/mobileWaterTransportOptions';
import { StationaryGasOptions } from '@shared/fuel-options/stationaryGasOptions';
import { StationaryLiquidOptions } from '@shared/fuel-options/stationaryLiquidOptions';
import { StationaryOtherEnergyOptions } from '@shared/fuel-options/stationaryOtherEnergyOptions';
import { StationarySolidOptions } from '@shared/fuel-options/stationarySolidOptions';
import { convertHeatCapacity } from '@shared/sharedHelperFunctions';

export interface StandardFuelGroup {
  readonly id: string;
  readonly label: string;
  readonly phase: MeterPhase;
  readonly mobile: boolean;
  readonly nameSuffix?: string;
  readonly options: readonly FuelTypeOption[];
}

export interface StandardFuelSelection {
  readonly phase: MeterPhase;
  readonly option: FuelTypeOption;
}

export const STANDARD_FUEL_GROUPS: readonly StandardFuelGroup[] = [
  { id: 'stationary-gas', label: 'Stationary gas', phase: 'Gas', mobile: false, options: StationaryGasOptions },
  { id: 'stationary-liquid', label: 'Stationary liquid', phase: 'Liquid', mobile: false, options: StationaryLiquidOptions },
  { id: 'stationary-solid', label: 'Stationary solid', phase: 'Solid', mobile: false, options: StationarySolidOptions },
  { id: 'mobile-heavy-duty', label: 'Mobile heavy-duty truck', phase: 'Liquid', mobile: true, nameSuffix: 'Heavy Duty Truck', options: MobileHeavyDutyTruckOptions },
  { id: 'mobile-bus', label: 'Mobile bus', phase: 'Liquid', mobile: true, nameSuffix: 'Bus', options: MobileBusOptions },
  { id: 'mobile-light-duty', label: 'Mobile light-duty truck', phase: 'Liquid', mobile: true, nameSuffix: 'Light Duty Truck', options: MobileLightDutyTruckOptions },
  { id: 'mobile-motorcycle', label: 'Mobile motorcycle', phase: 'Liquid', mobile: true, nameSuffix: 'Motorcycle', options: MobileMotorcycleOptions },
  { id: 'mobile-agriculture', label: 'Mobile off-road agriculture', phase: 'Liquid', mobile: true, nameSuffix: 'Off-road Agricultural', options: MobileOffRoadAgricultureOptions },
  { id: 'mobile-construction', label: 'Mobile off-road construction', phase: 'Liquid', mobile: true, nameSuffix: 'Off-road Construction', options: MobileOffRoadConstructionOptions },
  { id: 'mobile-passenger', label: 'Mobile passenger cars', phase: 'Liquid', mobile: true, nameSuffix: 'Passenger Cars', options: MobilePassangerCarOptions },
  { id: 'mobile-rail', label: 'Mobile rail', phase: 'Liquid', mobile: true, nameSuffix: 'Rail', options: MobileRailOptions },
  { id: 'mobile-onsite', label: 'Mobile onsite transport', phase: 'Liquid', mobile: true, nameSuffix: 'Transport Onsite', options: MobileTransportOnsiteOptions },
  { id: 'mobile-water', label: 'Mobile water transport', phase: 'Liquid', mobile: true, nameSuffix: 'Water Transport', options: MobileWaterTransportOptions }
];

export function standardFuelNames(): readonly string[] {
  return [
    ...STANDARD_FUEL_GROUPS.flatMap(group => group.options.map(option => option.value)),
    ...StationaryOtherEnergyOptions.map(option => option.value)
  ];
}

export function buildStandardFuelSelection(group: StandardFuelGroup, source: FuelTypeOption): StandardFuelSelection {
  const option = structuredClone(source);
  if (group.nameSuffix) {
    option.value = `${option.value} (${group.nameSuffix})`;
  }
  option.isMobile = group.mobile;
  return { phase: group.phase, option };
}

export function displayEmissionsRate(value: number | undefined, energyUnit: string): number | undefined {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return undefined;
  }
  if (energyUnit === 'MMBtu') {
    return value;
  }
  const conversion = new ConvertValue(1, 'MMBtu', energyUnit).convertedValue;
  return value / conversion;
}

export function storedEmissionsRate(value: number | undefined, energyUnit: string): number | undefined {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return undefined;
  }
  if (energyUnit === 'MMBtu') {
    return value;
  }
  const conversion = new ConvertValue(1, 'MMBtu', energyUnit).convertedValue;
  return value * conversion;
}

export function calculatedOutputRate(CO2: number, CH4: number, N2O: number): number {
  return round(CO2 + (CH4 * 28 / 1000) + (N2O * 265 / 1000), 4);
}

export function startingUnitFor(account: IdbAccount, phase: MeterPhase): string {
  if (phase === 'Gas') return account.volumeGasUnit;
  if (phase === 'Solid') return account.massUnit;
  return account.volumeLiquidUnit;
}

export function applyStandardFuel(
  draft: IdbCustomFuel,
  selection: StandardFuelSelection,
  account: IdbAccount
): IdbCustomFuel {
  const option = selection.option;
  const startingUnit = startingUnitFor(account, selection.phase);
  return {
    ...draft,
    value: `${option.value} (Modified)`,
    phase: selection.phase,
    startingUnit,
    heatCapacityValue: convertHeatCapacity(option, startingUnit, account.energyUnit),
    siteToSourceMultiplier: option.siteToSourceMultiplier,
    CO2: option.CO2,
    CH4: option.CH4,
    N2O: option.N2O,
    emissionsOutputRate: option.emissionsOutputRate,
    isBiofuel: option.isBiofuel ?? false,
    isMobile: option.isMobile ?? false,
    isOnRoad: option.isOnRoad ?? false,
    directEmissionsRate: false
  };
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
