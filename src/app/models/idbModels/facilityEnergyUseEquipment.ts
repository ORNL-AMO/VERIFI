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
    energyUseData: Array<EnergyEquipmentEnergyUseData>,
    equipmentType: EquipmentType,
    utilityData: Array<{
        energySource: MeterSource,
        size: number,
        numberOfEquipment: number,
        units: string
    }>
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
        energyUseData: [],
        equipmentType: 'Other',
        utilityData: [],
    }
}

export interface EnergyEquipmentEnergyUseData {
    year: number,
    energyUse: number,
    hoursOfOperation: number,
    loadFactor: number,
    dutyFactor: number,
    efficiency: number,
    overrideEnergyUse: boolean
}

export type EquipmentType = "Pump" | "Fan" | "Process Heating" | "Compressed Air" | "Steam" |
    "Process Cooling" | "Motor" | "Lighting" | "HVAC" | "Mobile" | "Other";