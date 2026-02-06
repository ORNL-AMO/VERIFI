import { getDateFromPredictorData } from "src/app/shared/dateHelperFunctions";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";
import { IdbPredictor } from "./predictor";

import * as _ from 'lodash';

export interface IdbPredictorData extends IdbEntry {
    facilityId: string,
    accountId: string,
    predictorId: string,
    amount: number,
    month: number,
    year: number,
    // dateStr: string,
    // date: Date,
    checked?: boolean,
    weatherDataWarning: boolean,
    weatherOverride: boolean,
    notes?: string,
    migratedDates?: boolean
}

export function getNewIdbPredictorData(predictor: IdbPredictor, existingData?: Array<IdbPredictorData>): IdbPredictorData {
    let pDate: Date = new Date();
    if (existingData) {
        let latestEntry: IdbPredictorData = _.maxBy(existingData, (pData: IdbPredictorData) => {
            let pDataDate: Date = getDateFromPredictorData(pData);
            return pDataDate.getTime();
        });
        if (latestEntry) {
            pDate = getDateFromPredictorData(latestEntry);
            pDate.setMonth(pDate.getMonth() + 1);
        }
    }
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: predictor.facilityId,
        accountId: predictor.accountId,
        predictorId: predictor.guid,
        amount: undefined,
        month: pDate.getMonth() + 1,
        year: pDate.getFullYear(),
        // dateStr: getStringFromDate(pDate),
        checked: false,
        weatherDataWarning: false,
        weatherOverride: false,
        notes: ''
    }
}