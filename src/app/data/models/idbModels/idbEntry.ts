import { getGUID } from "src/app/shared/sharedHelperFunctions";

export interface IdbEntry {
    id?: number;
    guid: string;
    createdDate: Date;
    modifiedDate: Date;
}

export function getNewIdbEntry(): IdbEntry {
    return {
        guid: getGUID(),
        createdDate: new Date(),
        modifiedDate: new Date()
    }
}
