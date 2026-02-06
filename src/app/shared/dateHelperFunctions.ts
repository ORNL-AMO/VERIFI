//HELPER FUNCTIONS FOR DATES
//dates are stored as string in format YYYY-MM-DD

import { IdbPredictorData } from "../models/idbModels/predictorData";
import * as _ from 'lodash';

// export function getStringFromDate(date: Date): string {
//     let year = date.getFullYear();
//     let month = (date.getMonth() + 1).toString().padStart(2, '0');
//     let day = date.getDate().toString().padStart(2, '0');
//     return `${year}-${month}-${day}`;
// }

// export function getMonthFromDateString(dateStr: string): number {
//     let month: number = parseInt(dateStr.split('-')[1]);
//     return month;
// }

// export function getDayFromDateString(dateStr: string): number {
//     let day: number = parseInt(dateStr.split('-')[2]);
//     return day;
// }

// export function getYearFromDateString(dateStr: string): number {
//     let year: number = parseInt(dateStr.split('-')[0]);
//     return year;
// }

// export function getUTCDateFromDateString(dateStr: string): Date {
//     let year: number = getYearFromDateString(dateStr);
//     let month: number = getMonthFromDateString(dateStr);
//     let day: number = getDayFromDateString(dateStr);
//     return new Date(Date.UTC(year, month - 1, day));
// }

// export function getDateFromString(dateStr: string): Date {
//     let year: number = getYearFromDateString(dateStr);
//     let month: number = getMonthFromDateString(dateStr);
//     let day: number = getDayFromDateString(dateStr);
//     return new Date(year, month - 1, day);
// }


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