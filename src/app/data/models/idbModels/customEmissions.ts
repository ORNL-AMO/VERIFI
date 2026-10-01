import { getNewIdbEntry, IdbEntry } from "./idbEntry";

export interface IdbCustomEmissionsItem extends IdbEntry {
    accountId: string,
    date: Date,
    subregion: string,
    directEmissionsRate: boolean,
    locationEmissionRates: Array<{ co2Emissions: number, CO2: number, CH4: number, N2O: number, year: number }>,
    residualEmissionRates: Array<{ co2Emissions: number, CO2: number, CH4: number, N2O: number, year: number }>,
}

export function getNewAccountEmissionsItem(accountGuid: string): IdbCustomEmissionsItem {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        accountId: accountGuid,
        date: new Date(),
        subregion: 'New Custom Subregion',
        locationEmissionRates: [],
        residualEmissionRates: [],
        directEmissionsRate: false
    }
}