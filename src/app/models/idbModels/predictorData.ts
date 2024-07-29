import { getNewIdbEntry, IdbEntry } from "./idbEntry";
import { IdbPredictor } from "./predictor";

import * as _ from 'lodash';

export interface IdbPredictorData extends IdbEntry {
    facilityId: string,
    accountId: string,
    predictorId: string,
    amount: number,
    date: Date,
    checked?: boolean,
    weatherDataWarning: boolean,
    weatherOverride: boolean
}

export function getNewIdbPredictorData(predictor: IdbPredictor, existingData: Array<IdbPredictorData>): IdbPredictorData {
    let pDate: Date = new Date();
    let latestEntry: IdbPredictorData = _.maxBy(existingData, (pData: IdbPredictorData) => {
        return new Date(pData.date);
    });
    if (latestEntry) {
        pDate = new Date(latestEntry.date);
        pDate.setMonth(pDate.getMonth() + 1);
    }
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: predictor.facilityId,
        accountId: predictor.accountId,
        predictorId: predictor.guid,
        amount: undefined,
        //todo: increment date
        date: pDate,
        checked: false,
        weatherDataWarning: false,
        weatherOverride: false
    }
}