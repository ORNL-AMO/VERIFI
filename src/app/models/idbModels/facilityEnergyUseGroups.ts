import { getNewIdbEntry, IdbEntry } from "./idbEntry";

export interface IdbFacilityEnergyUseGroup extends IdbEntry {
    facilityId: string,
    accountId: string,
    name: string,
    sidebarOpen: boolean,
    notes: string
}

export function getNewIdbFacilityEnergyUseGroup(accountId: string, facilityId: string): IdbFacilityEnergyUseGroup {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: facilityId,
        accountId: accountId,
        name: 'Energy Use Group',
        sidebarOpen: true,
        notes: ''
    }
}