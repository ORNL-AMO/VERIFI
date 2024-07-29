import { getNewIdbEntry, IdbEntry } from "./idbEntry";
import { IdbPredictor } from "./predictor";



export interface IdbPredictorData extends IdbEntry {
    facilityId: string,
    accountId: string,
    predictorId: string,
    amount: number,
    date: Date,
    checked?: boolean
}

export function getNewIdbPredictorData(predictor: IdbPredictor): IdbPredictorData {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: predictor.facilityId,
        accountId: predictor.accountId,
        predictorId: predictor.guid,
        amount: undefined,
        //todo: increment date
        date: new Date(),
        checked: false
    }
}