//HELPER FUNCTIONS FOR DATES
import { IdbPredictorData } from "../models/idbModels/predictorData";
import * as _ from 'lodash';
import { IdbUtilityMeterData } from "../models/idbModels/utilityMeterData";

//PREDICTOR DATA FUNCTIONS
export function getDateFromPredictorData(predictorData: IdbPredictorData): Date {
    return new Date(predictorData.year, predictorData.month - 1, 1);
}

export function setPredictorDateDataFromDate(predictorData: IdbPredictorData, date: Date): IdbPredictorData {
    predictorData.year = date.getFullYear();
    predictorData.month = date.getMonth() + 1;
    return predictorData;
}

export function getLatestPredictorData(predictorData: Array<IdbPredictorData>): IdbPredictorData {
    let latestPredictorData: IdbPredictorData = _.maxBy(predictorData, (pData: IdbPredictorData) => {
        let pDataDate: Date = getDateFromPredictorData(pData);
        return pDataDate.getTime();
    });
    return latestPredictorData;
}

export function getLatestPredictorDataDate(predictorData: Array<IdbPredictorData>): Date {
    let latestPredictorData: IdbPredictorData = getLatestPredictorData(predictorData);
    if (latestPredictorData) {
        return getDateFromPredictorData(latestPredictorData);
    } else {
        return undefined;
    }
}

export function getEarliestPredictorData(predictorData: Array<IdbPredictorData>): IdbPredictorData {
    let earliestPredictorData: IdbPredictorData = _.minBy(predictorData, (pData: IdbPredictorData) => {
        let pDataDate: Date = getDateFromPredictorData(pData);
        return pDataDate.getTime();
    });
    return earliestPredictorData;
}

export function getEarliestPredictorDataDate(predictorData: Array<IdbPredictorData>): Date {
    let earliestPredictorData: IdbPredictorData = getEarliestPredictorData(predictorData);
    if (earliestPredictorData) {
        return getDateFromPredictorData(earliestPredictorData);
    } else {
        return undefined;
    }
}

//METER DATA FUNCTIONS
export function getDateFromMeterData(meterData: IdbUtilityMeterData): Date {
    return new Date(meterData.year, meterData.month - 1, meterData.day);
}

export function setMeterDataDateFromDate(meterData: IdbUtilityMeterData, date: Date): IdbUtilityMeterData {
    meterData.year = date.getFullYear();
    meterData.month = date.getMonth() + 1;
    meterData.day = date.getDate();
    return meterData;
}

export function getLatestMeterData(meterData: Array<IdbUtilityMeterData>): IdbUtilityMeterData {
    let latestMeterData: IdbUtilityMeterData = _.maxBy(meterData, (mData: IdbUtilityMeterData) => {
        let mDataDate: Date = getDateFromMeterData(mData);
        return mDataDate.getTime();
    });
    return latestMeterData;
}

export function getLatestMeterDataDate(meterData: Array<IdbUtilityMeterData>): Date {
    let latestMeterData: IdbUtilityMeterData = getLatestMeterData(meterData);
    if (latestMeterData) {
        return getDateFromMeterData(latestMeterData);
    } else {
        return undefined;
    }
}

export function getEarliestMeterData(meterData: Array<IdbUtilityMeterData>): IdbUtilityMeterData {
    let earliestMeterData: IdbUtilityMeterData = _.minBy(meterData, (mData: IdbUtilityMeterData) => {
        let mDataDate: Date = getDateFromMeterData(mData);
        return mDataDate.getTime();
    });
    return earliestMeterData;
}

export function getEarliestMeterDataDate(meterData: Array<IdbUtilityMeterData>): Date {
    let earliestMeterData: IdbUtilityMeterData = getEarliestMeterData(meterData);
    if (earliestMeterData) {
        return getDateFromMeterData(earliestMeterData);
    } else {
        return undefined;
    }
}

export function getMeterDataDateString(meterData: IdbUtilityMeterData): string {
    if (meterData.year && meterData.month && meterData.day) {
        let monthString: string = meterData.month.toString().padStart(2, '0');
        let dayString: string = meterData.day.toString().padStart(2, '0');
        return meterData.year + '-' + monthString + '-' + dayString;
    } else {
        return undefined;
    }
}