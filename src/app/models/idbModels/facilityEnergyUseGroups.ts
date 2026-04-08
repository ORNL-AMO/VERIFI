import { FlatEnergyUseColors } from "src/app/shared/utilityColors";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";

export interface IdbFacilityEnergyUseGroup extends IdbEntry {
    facilityId: string,
    accountId: string,
    name: string,
    sidebarOpen: boolean,
    notes: string,
    color: string
}

export function getNewIdbFacilityEnergyUseGroup(accountId: string, facilityId: string): IdbFacilityEnergyUseGroup {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: facilityId,
        accountId: accountId,
        name: 'Energy Use Group',
        sidebarOpen: false,
        notes: '',
        color: getRandomFlatHexColor()
    }
}

export function getRandomFlatHexColor(): string {
    const randomIndex = Math.floor(Math.random() * FlatEnergyUseColors.length);
    return FlatEnergyUseColors[randomIndex];
}
