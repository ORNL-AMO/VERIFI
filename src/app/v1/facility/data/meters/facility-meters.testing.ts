import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';

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
