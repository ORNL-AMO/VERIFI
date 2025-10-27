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
    units: string
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
        units: ''
    }
}