import { getNewIdbEntry, IdbEntry } from "./idbEntry";

export interface ApplicationInstanceData extends IdbEntry {
    isSurveyToastDone: boolean,
    isSurveyDone: boolean,
    doSurveyReminder: boolean,
    appOpenCount: number,
}

export function getNewApplicationInstanceData(): ApplicationInstanceData {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        isSurveyToastDone: false,
        isSurveyDone: false,
        doSurveyReminder: false,
        appOpenCount: 0,
    }
}