import { MonthlyData } from "src/app/models/calanderization";
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import { getFiscalYear } from "./calanderizationFunctions";

export function getMonthlyStartAndEndDate(facilityOrAccount: IdbFacility | IdbAccount, analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem): { baselineDate: Date, endDate: Date } {
    let baselineDate: Date;
    let endDate: Date;
    if (facilityOrAccount.fiscalYear == 'calendarYear') {
        baselineDate = new Date(facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear, 0, 1);
        endDate = new Date(analysisItem.reportYear + 1, 0, 1);
    } else {
        if (facilityOrAccount.fiscalYearCalendarEnd) {
            baselineDate = new Date(facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear - 1, facilityOrAccount.fiscalYearMonth);
            endDate = new Date(analysisItem.reportYear, facilityOrAccount.fiscalYearMonth);
        } else {
            baselineDate = new Date(facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear, facilityOrAccount.fiscalYearMonth);
            endDate = new Date(analysisItem.reportYear + 1, facilityOrAccount.fiscalYearMonth);
        }
    }
    return {
        baselineDate: baselineDate,
        endDate: endDate
    }
}

export function filterYearPredictorData(predictorData: Array<IdbPredictorEntry>, year: number, facilityOrAccount: IdbFacility | IdbAccount): Array<IdbPredictorEntry> {
    if (facilityOrAccount.fiscalYear == 'calendarYear') {
        return predictorData.filter(predictorData => {
            return new Date(predictorData.date).getUTCFullYear() == year;
        });
    } else {
        return predictorData.filter(predictorDataItem => {
            let predictorItemDate: Date = new Date(predictorDataItem.date);
            return getFiscalYear(predictorItemDate, facilityOrAccount) == year;
        });
    }
}

export function filterYearMeterData(meterData: Array<MonthlyData>, year: number, facility: IdbFacility): Array<MonthlyData> {
    if (facility.fiscalYear == 'calendarYear') {
        return meterData.filter(meterDataItem => {
            return new Date(meterDataItem.date).getUTCFullYear() == year;
        });
    } else {
        return meterData.filter(meterDataItem => {
            let meterItemDate: Date = new Date(meterDataItem.date);
            return getFiscalYear(meterItemDate, facility) == year;
        });
    }
}

export function getPredictorUsage(predictorVariables: Array<PredictorData>, predictorData: Array<IdbPredictorEntry>): number {
    let totalPredictorUsage: number = 0;
    predictorVariables.forEach(variable => {
        predictorData.forEach(data => {
            let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
            totalPredictorUsage = totalPredictorUsage + predictorData.amount;
        });
    });
    return totalPredictorUsage;
}

export function checkAnalysisValue(val: number): number {
    if (Math.abs(val) < .0000001) {
        return 0
    } else {
        return val;
    }
}