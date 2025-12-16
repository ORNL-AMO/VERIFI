import { MeterSource } from "../constantsAndTypes";
import { IdbFacilityEnergyUseGroup } from "./facilityEnergyUseGroups";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";

export interface IdbFacilityEnergyUseEquipment extends IdbEntry {
    guid: string,
    facilityId: string,
    accountId: string,
    energyUseGroupId: string,
    utilityMeterGroupId: string,
    name: string,
    notes: string,
    operatingConditionsData: Array<EnergyEquipmentOperatingConditionsData>,
    equipmentType: EquipmentType,
    utilityData: Array<EquipmentUtilityData>
}

export function getNewIdbFacilityEnergyUseEquipment(energyUseGroup: IdbFacilityEnergyUseGroup): IdbFacilityEnergyUseEquipment {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: energyUseGroup.facilityId,
        accountId: energyUseGroup.accountId,
        energyUseGroupId: energyUseGroup.guid,
        utilityMeterGroupId: '',
        name: '',
        notes: '',
        operatingConditionsData: [],
        equipmentType: 'Other',
        utilityData: [],
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
    energyUse: Array<{ year: number, energyUse: number, overrideEnergyUse: boolean}>
}

export type EquipmentType = "Pump" | "Fan" | "Process Heating" | "Compressed Air" | "Steam" |
    "Process Cooling" | "Motor" | "Lighting" | "HVAC" | "Mobile" | "Other";