import { MeterSource } from "../constantsAndTypes";
import { IdbFacilityEnergyUseGroup } from "./facilityEnergyUseGroups";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";

export interface IdbFacilityEnergyUseEquipment extends IdbEntry {
    guid: string,
    facilityId: string,
    accountId: string,
    energyUseGroupId: string,
    name: string,
    energySource: MeterSource,
    size: number,
    units: string,
    notes: string,
    energyUseData: Array<EnergyEquipmentEnergyUseData>,
    equipmentType: EquipmentType
}

export function getNewIdbFacilityEnergyUseEquipment(energyUseGroup: IdbFacilityEnergyUseGroup): IdbFacilityEnergyUseEquipment {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: energyUseGroup.facilityId,
        accountId: energyUseGroup.accountId,
        energyUseGroupId: energyUseGroup.guid,
        name: 'Equipment or System',
        energySource: 'Electricity',
        size: undefined,
        units: '',
        notes: '',
        energyUseData: [],
        equipmentType: 'Other'
    }
}

export interface EnergyEquipmentEnergyUseData {
    year: number,
    energyUse: number,
    hoursOfOperation: number,
    loadFactor: number,
    dutyFactor: number,
    overrideValue: number
}

export type EquipmentType = "Pump" | "Fan" | "Process Heating" | "Compressed Air" | "Steam" |
    "Process Cooling" | "Motor" | "Lighting" | "HVAC" | "Mobile" | "Other";