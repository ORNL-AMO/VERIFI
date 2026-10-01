import { getNewIdbEntry, IdbEntry } from "./idbEntry";


export interface IdbElectronBackup extends IdbEntry {
    accountId: string,
    guid: string,
    dataBackupId: string,
    timeStamp: Date
}

export function getNewIdbElectronBackup(accountId: string, dataBackupId: string): IdbElectronBackup{
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        accountId: accountId,
        dataBackupId: dataBackupId,
        timeStamp: new Date()
    }
}