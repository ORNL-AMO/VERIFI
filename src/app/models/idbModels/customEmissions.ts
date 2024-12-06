import { getNewIdbEntry, IdbEntry } from "./idbEntry";

export interface IdbCustomEmissionsItem extends IdbEntry {
    accountId: string,
    date: Date,
    subregion: string,
    locationEmissionRates: Array<{ co2Emissions: number, year: number }>,
    residualEmissionRates: Array<{ co2Emissions: number, year: number }>,
}

export function getNewAccountEmissionsItem(accountGuid: string): IdbCustomEmissionsItem {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        accountId: accountGuid,
        date: new Date(),
        subregion: 'New Custom Subregion',
        locationEmissionRates: [],
        residualEmissionRates: []
    }
}