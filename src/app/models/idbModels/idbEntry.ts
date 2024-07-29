import { getGUID } from "src/app/shared/sharedHelperFuntions";

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
