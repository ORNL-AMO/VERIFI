import { getGUID } from "src/app/shared/sharedHelperFunctions";
import { MeterSource } from "../constantsAndTypes";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";


export interface IdbFacilityEnergyUseGroup extends IdbEntry {
    facilityId: string,
    accountId: string,
    name: string,
    sidebarOpen: boolean,
    equipmentItems: Array<EnergyUseGroupEquipment>
}

export function getNewIdbFacilityEnergyUseGroup(accountId: string, facilityId: string): IdbFacilityEnergyUseGroup {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: facilityId,
        accountId: accountId,
        name: 'Energy Use Group',
        sidebarOpen: true,
        equipmentItems: new Array<EnergyUseGroupEquipment>()
    }
}

export function getNewEnergyUseEquipment(energyUseGroupId: string): EnergyUseGroupEquipment {
    return {
        guid: getGUID(),
        energyUseGroupId: energyUseGroupId,
        name: '',
        energySource: 'Electricity',
        size: undefined,
        units: ''
    }
}

export interface EnergyUseGroupEquipment {
    guid: string,
    energyUseGroupId: string,
    name: string,
    energySource: MeterSource
    size: number,
    units: string
}