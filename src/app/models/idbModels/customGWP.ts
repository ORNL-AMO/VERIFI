import { GlobalWarmingPotential } from "../globalWarmingPotentials";
import { getNewIdbEntry, IdbEntry } from "../idb";
import { IdbAccount } from "./account";

export interface IdbCustomGWP extends GlobalWarmingPotential, IdbEntry {
    id?: number,
    accountId: string,
    date: Date,
    guid: string
}

export function getNewAccountCustomGWP(selectedAccount: IdbAccount): IdbCustomGWP {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        accountId: selectedAccount.guid,
        date: new Date(),
        value: this.getUniqValue(),
        label: undefined,
        display: undefined,
        gwp: undefined
    }
}