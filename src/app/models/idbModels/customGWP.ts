import { GlobalWarmingPotential } from "../globalWarmingPotentials";
import { IdbAccount } from "./account";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";

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