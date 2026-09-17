import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';

export function account(options: Partial<IdbAccount> = {}): IdbAccount {
  return {
    guid: options.guid ?? 'account-a',
    name: options.name ?? 'Account A',
    ...options
  } as IdbAccount;
}

export function facility(options: Partial<IdbFacility> = {}): IdbFacility {
  return {
    guid: options.guid ?? 'facility-a',
    accountId: options.accountId ?? 'account-a',
    name: options.name ?? 'Facility A',
    energyUnit: options.energyUnit ?? 'kWh',
    electricityUnit: options.electricityUnit ?? 'kWh',
    ...options
  } as IdbFacility;
}

export function meter(options: Partial<IdbUtilityMeter>): IdbUtilityMeter {
  return {
    guid: options.guid ?? 'meter-a',
    accountId: 'account-a',
    facilityId: 'facility-a',
    groupId: options.groupId,
    name: options.name ?? 'Meter A',
    source: options.source ?? 'Electricity',
    meterNumber: undefined,
    accountNumber: undefined,
    phase: 'Gas',
    siteToSource: 3,
    supplier: undefined,
    startingUnit: 'kWh',
    energyUnit: 'kWh',
    demandUnit: 'kW',
    meterReadingDataApplication: 'backward',
    scope: 3,
    agreementType: 1,
    includeInEnergy: true,
    retainRECs: false,
    directConnection: false,
    recsMultiplier: 0,
    greenPurchaseFraction: .5,
    marketGHGMultiplier: 1,
    locationGHGMultiplier: 1,
    charges: [],
    ...options
  } as IdbUtilityMeter;
}

export function reading(options: Partial<IdbUtilityMeterData>): IdbUtilityMeterData {
  return {
    guid: options.guid ?? 'reading-a',
    accountId: 'account-a',
    facilityId: 'facility-a',
    meterId: options.meterId ?? 'meter-a',
    day: 1,
    month: 1,
    year: 2026,
    migratedDates: true,
    totalEnergyUse: 10,
    totalCost: 20,
    checked: false,
    ...options
  } as IdbUtilityMeterData;
}

export function group(options: Partial<IdbUtilityMeterGroup>): IdbUtilityMeterGroup {
  return {
    guid: options.guid ?? 'group-a',
    accountId: 'account-a',
    facilityId: 'facility-a',
    groupType: options.groupType ?? 'Energy',
    name: options.name ?? 'Group A',
    visible: true,
    ...options
  } as IdbUtilityMeterGroup;
}

export function calendarizedMeter(
  meterValue: IdbUtilityMeter,
  monthlyDataValue: MonthlyData[],
  options: Partial<CalanderizedMeter> = {}
): CalanderizedMeter {
  return {
    meter: meterValue,
    consumptionUnit: options.consumptionUnit ?? 'kgal',
    monthlyData: monthlyDataValue,
    showConsumption: options.showConsumption ?? true,
    showEnergyUse: options.showEnergyUse ?? true,
    showElectricalEmissions: false,
    showOtherScope2Emissions: false,
    showStationaryEmissions: false,
    showFugitiveEmissions: false,
    showProcessEmissions: false,
    showMobileEmissions: false,
    energyUnit: options.energyUnit ?? 'MMBtu',
    energyIsSource: false,
    ...options
  };
}

export function monthlyData(options: Partial<MonthlyData> = {}): MonthlyData {
  const year = options.year ?? 2026;
  const monthNumValue = options.monthNumValue ?? 0;
  return {
    month: options.month ?? 'January',
    monthNumValue,
    year,
    fiscalYear: options.fiscalYear ?? year,
    energyConsumption: options.energyConsumption ?? 0,
    energyUse: options.energyUse ?? 0,
    energyCost: options.energyCost ?? 0,
    date: options.date ?? new Date(year, monthNumValue, 1),
    readingType: options.readingType ?? 'metered',
    ...options
  } as MonthlyData;
}
