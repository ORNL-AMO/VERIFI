import { MeterPhase, MeterSource, WaterDischargeType, WaterIntakeType } from "../constantsAndTypes"
import { getNewIdbEntry, IdbEntry } from "../idb"

export type MeterReadingDataApplication = "backward" | "fullMonth" | "fullYear";
export interface IdbUtilityMeter {
    //keys (id primary)
    id?: number,
    guid: string,
    facilityId: string,
    accountId: string,
    groupId: string,
    //data
    meterNumber: string,
    accountNumber: number,
    phase?: MeterPhase,
    heatCapacity?: number,
    siteToSource: number,
    name: string,
    location?: string,
    supplier: string,
    notes?: string,
    source: MeterSource,
    //group = groupName
    group?: string

    startingUnit: string,
    energyUnit: string,
    fuel?: string
    visible?: boolean
    importWizardName?: string
    meterReadingDataApplication?: MeterReadingDataApplication,
    unitsDifferent?: boolean,
    ignoreDuplicateMonths?: boolean,
    ignoreMissingMonths?: boolean,
    scope: number,
    agreementType: number,
    includeInEnergy: boolean,
    retainRECs: boolean,
    directConnection: boolean,
    // GHGMultiplier: number,
    recsMultiplier: number,
    greenPurchaseFraction: number,
    marketGHGMultiplier: number,
    locationGHGMultiplier: number,
    isValid?: boolean,
    skipImport?: boolean,
    waterIntakeType?: WaterIntakeType,
    waterDischargeType?: WaterDischargeType,
    vehicleCategory?: number,
    vehicleType?: number,
    vehicleCollectionType?: number,
    vehicleCollectionUnit?: string,
    vehicleFuel?: string,
    vehicleFuelEfficiency?: number,
    vehicleDistanceUnit?: string
    globalWarmingPotentialOption?: number,
    globalWarmingPotential?: number
}

export function getNewIdbUtilityMeter(facilityId: string, accountId: string, setDefaults: boolean, energyUnit: string): IdbUtilityMeter {
    let idbEntry: IdbEntry = getNewIdbEntry();
    
    let source: MeterSource;
    let startingUnit: string;
    if (setDefaults) {
        source = 'Electricity';
        startingUnit = energyUnit;
        // startingUnit = 'kWh';
        // energyUnit = 'kWh';
    }
    return {
        ...idbEntry,
        facilityId: facilityId,
        accountId: accountId,
        // id: undefined,
        groupId: undefined,
        meterNumber: undefined,
        accountNumber: undefined,
        phase: "Gas",
        heatCapacity: undefined,
        siteToSource: 3,
        name: "New Meter",
        location: undefined,
        supplier: undefined,
        notes: undefined,
        source: source,
        group: undefined,
        startingUnit: startingUnit,
        energyUnit: energyUnit,
        fuel: undefined,
        scope: 3,
        agreementType: 1,
        includeInEnergy: true,
        retainRECs: false,
        directConnection: false,
        locationGHGMultiplier: 1,
        marketGHGMultiplier: 1,
        recsMultiplier: 0,
        greenPurchaseFraction: .5,
        vehicleCategory: 1,
        vehicleCollectionType: 1,
        vehicleDistanceUnit: 'mi',
        vehicleCollectionUnit: 'gal'
    }
}