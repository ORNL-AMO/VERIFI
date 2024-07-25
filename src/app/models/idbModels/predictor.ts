import { getNewIdbEntry, IdbEntry } from "../idb";


export interface IdbPredictor extends IdbEntry {
    facilityId: string,
    accountId: string,
    date: Date
}

export function getNewIdbPredictor(accountId: string, facilityId: string): IdbPredictor {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: facilityId,
        accountId: accountId,
        date: undefined
    }
}