import { MonthlyData } from "src/app/models/calanderization";
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, PredictorData } from "src/app/models/idb";
import { getFiscalYear } from "./calanderizationFunctions";
import { EmissionsResults } from "src/app/models/eGridEmissions";
import * as _ from 'lodash';
import { IUseAndCost } from "../dashboard-calculations/useAndCostClass";

export function getMonthlyStartAndEndDate(facilityOrAccount: IdbFacility | IdbAccount, analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem): { baselineDate: Date, endDate: Date } {
    let baselineDate: Date;
    let endDate: Date;
    if (facilityOrAccount.fiscalYear == 'calendarYear') {
        baselineDate = new Date(analysisItem.baselineYear, 0, 1);
        endDate = new Date(analysisItem.reportYear + 1, 0, 1);
    } else {
        if (facilityOrAccount.fiscalYearCalendarEnd) {
            baselineDate = new Date(analysisItem.baselineYear - 1, facilityOrAccount.fiscalYearMonth);
            endDate = new Date(analysisItem.reportYear, facilityOrAccount.fiscalYearMonth);
        } else {
            baselineDate = new Date(analysisItem.baselineYear, facilityOrAccount.fiscalYearMonth);
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

export function getIncludedMeters(meters: Array<IdbUtilityMeter>, selectedAnalysisItem: IdbAccountAnalysisItem, accountAnalysisItems: Array<IdbAnalysisItem>, year: number) {
    let includedMeters: Array<IdbUtilityMeter> = new Array()
    selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
        if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
            let facilityAnalysisItem: IdbAnalysisItem = accountAnalysisItems.find(accountItem => { return accountItem.guid == item.analysisItemId });
            if (facilityAnalysisItem.baselineYear <= year && facilityAnalysisItem.reportYear >= year) {
                facilityAnalysisItem.groups.forEach(group => {
                    if (group.analysisType != 'skip') {
                        let filteredMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
                            return meter.groupId == group.idbGroupId;
                        });
                        includedMeters = includedMeters.concat(filteredMeters);
                    }
                });
            }
        }
    });
    return includedMeters;
}

export function getEmissionsTotalsFromArray(data: Array<MonthlyData | EmissionsResults | IUseAndCost>): EmissionsResults {
    return {
        RECs: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.RECs }),
        locationElectricityEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.locationElectricityEmissions }),
        marketElectricityEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.marketElectricityEmissions }),
        otherScope2Emissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.otherScope2Emissions }),
        scope2LocationEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.scope2LocationEmissions }),
        scope2MarketEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.scope2MarketEmissions }),
        excessRECs: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.excessRECs }),
        excessRECsEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.excessRECsEmissions }),
        mobileCarbonEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.mobileCarbonEmissions }),
        mobileBiogenicEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.mobileBiogenicEmissions }),
        mobileOtherEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.mobileOtherEmissions }),
        mobileTotalEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.mobileTotalEmissions }),
        fugitiveEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.fugitiveEmissions }),
        processEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.processEmissions }),
        stationaryBiogenicEmmissions:  _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.stationaryBiogenicEmmissions }),
        stationaryEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.stationaryEmissions }),
        totalScope1Emissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.totalScope1Emissions }),
        totalWithMarketEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.totalWithMarketEmissions }),
        totalWithLocationEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.totalWithLocationEmissions }),
        totalBiogenicEmissions:  _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.totalBiogenicEmissions }),
        stationaryCarbonEmissions:  _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.stationaryCarbonEmissions }),
        stationaryOtherEmissions:  _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.stationaryOtherEmissions }),
    }
}

export function checkValueNaN(val: number): number {
    if (isNaN(val)) {
        return 0;
    }
    return val;
}
