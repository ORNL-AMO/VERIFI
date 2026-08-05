import { getNewIdbEntry, IdbEntry } from "./idbEntry";
import { CURRENT_DATA_VERSION } from "../../indexedDB/data-migrations/data-migration.models";

export interface ApplicationInstanceData extends IdbEntry {
    dataVersion?: number,
    isSurveyToastDone: boolean,
    isSurveyDone: boolean,
    doSurveyReminder: boolean,
    appOpenCount: number,
    subscriberId?: number,
}

export function getNewApplicationInstanceData(): ApplicationInstanceData {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        dataVersion: CURRENT_DATA_VERSION,
        isSurveyToastDone: false,
        isSurveyDone: false,
        doSurveyReminder: false,
        appOpenCount: 0,
    }
}
