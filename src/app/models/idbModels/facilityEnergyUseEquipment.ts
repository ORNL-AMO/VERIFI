import { MeterSource } from "../constantsAndTypes";
import { IdbFacilityEnergyUseGroup, getRandomFlatHexColor } from "./facilityEnergyUseGroups";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";

export interface IdbFacilityEnergyUseEquipment extends IdbEntry {
    guid: string,
    facilityId: string,
    accountId: string,
    energyUseGroupId: string,
    utilityMeterGroupIds: Array<string>,
    name: string,
    notes: string,
    operatingConditionsData: Array<EnergyEquipmentOperatingConditionsData>,
    equipmentType: EquipmentType,
    utilityData: Array<EquipmentUtilityData>,
    color: string
}

export function getNewIdbFacilityEnergyUseEquipment(energyUseGroup: IdbFacilityEnergyUseGroup, latestYear: number): IdbFacilityEnergyUseEquipment {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: energyUseGroup.facilityId,
        accountId: energyUseGroup.accountId,
        energyUseGroupId: energyUseGroup.guid,
        utilityMeterGroupIds: [],
        name: '',
        notes: '',
        operatingConditionsData: [{
            //needs to be last full year of data
            year: latestYear,
            hoursOfOperation: 8760,
            loadFactor: 100,
            dutyFactor: 100,
            efficiency: 100,
        }],
        equipmentType: 'Other',
        utilityData: [],
        color: getRandomFlatHexColor()
    }
}

export interface EnergyEquipmentOperatingConditionsData {
    year: number,
    hoursOfOperation: number,
    loadFactor: number,
    dutyFactor: number,
    efficiency: number,
}

export interface EquipmentUtilityData {
    energySource: MeterSource,
    size: number,
    numberOfEquipment: number,
    units: string,
    energyUse: Array<EquipmentUtilityDataEnergyUse>
}

export interface EquipmentUtilityDataEnergyUse {
    year: number, energyUse: number, overrideEnergyUse: boolean
}

export type EquipmentType = "Pump" | "Fan" | "Process Heating" | "Compressed Air" | "Steam" |
    "Process Cooling" | "Motor" | "Lighting" | "HVAC" | "Mobile" | "Other";