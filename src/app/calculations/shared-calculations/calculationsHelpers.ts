import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { getFiscalYear } from "./calanderizationFunctions";
import { EmissionsResults } from "src/app/models/eGridEmissions";
import * as _ from 'lodash';
import { IUseAndCost } from "../dashboard-calculations/useAndCostClass";
import { IdbAccount } from "src/app/models/idbModels/account";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { AnalysisGroup, AnalysisGroupPredictorVariable } from "src/app/models/analysis";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { getDateFromPredictorData } from "src/app/shared/dateHelperFunctions";

export function getMonthlyStartAndEndDate(facilityOrAccount: IdbFacility | IdbAccount, analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem, group: AnalysisGroup): { baselineDate: Date, endDate: Date, bankedAnalysisDate: Date } {
    let baselineDate: Date;
    let endDate: Date;
    let bankedAnalysisDate: Date;
    let baselineYear: number = analysisItem.baselineYear;
    if (group && group.applyBanking && analysisItem.hasBanking) {
        baselineYear = group.newBaselineYear;
    }

    if (facilityOrAccount.fiscalYear == 'calendarYear') {
        baselineDate = new Date(baselineYear, 0, 1);
        endDate = new Date(analysisItem.calculatedReportYear + 1, 0, 1);
        if (analysisItem.hasBanking && group && group.applyBanking) {
            bankedAnalysisDate = new Date(group.bankedAnalysisYear + 1, 0, 1);
        }
    } else {
        if (facilityOrAccount.fiscalYearCalendarEnd) {
            baselineDate = new Date(baselineYear - 1, facilityOrAccount.fiscalYearMonth);
            endDate = new Date(analysisItem.calculatedReportYear, facilityOrAccount.fiscalYearMonth);
            if (analysisItem.hasBanking && group && group.applyBanking) {
                bankedAnalysisDate = new Date(group.bankedAnalysisYear, facilityOrAccount.fiscalYearMonth);
            }
        } else {
            baselineDate = new Date(baselineYear, facilityOrAccount.fiscalYearMonth);
            endDate = new Date(analysisItem.calculatedReportYear + 1, facilityOrAccount.fiscalYearMonth);
            if (analysisItem.hasBanking && group && group.applyBanking) {
                bankedAnalysisDate = new Date(group.bankedAnalysisYear, facilityOrAccount.fiscalYearMonth);
            }
        }
    }
    return {
        baselineDate: baselineDate,
        endDate: endDate,
        bankedAnalysisDate: bankedAnalysisDate
    }
}

export function filterYearPredictorData(predictorData: Array<IdbPredictorData>, year: number, facilityOrAccount: IdbFacility | IdbAccount): Array<IdbPredictorData> {
    if (facilityOrAccount.fiscalYear == 'calendarYear') {
        return predictorData.filter(predictorData => {
            return predictorData.year == year;
        });
    } else {
        return predictorData.filter(predictorDataItem => {
            let predictorItemDate: Date = getDateFromPredictorData(predictorDataItem);
            return getFiscalYear(predictorItemDate, facilityOrAccount) == year;
        });
    }
}

export function filterYearMeterData(meterData: Array<MonthlyData>, year: number, facility: IdbFacility): Array<MonthlyData> {
    if (facility.fiscalYear == 'calendarYear') {
        return meterData.filter(meterDataItem => {
            return new Date(meterDataItem.date).getFullYear() == year;
        });
    } else {
        return meterData.filter(meterDataItem => {
            let meterItemDate: Date = new Date(meterDataItem.date);
            return getFiscalYear(meterItemDate, facility) == year;
        });
    }
}

export function getPredictorUsage(predictorVariables: Array<AnalysisGroupPredictorVariable>, predictorData: Array<IdbPredictorData>): number {
    let totalPredictorUsage: number = 0;
    predictorVariables.forEach(variable => {
        let variableData: Array<IdbPredictorData> = predictorData.filter(pData => {
            return pData.predictorId == variable.id;
        })
        totalPredictorUsage = totalPredictorUsage + _.sumBy(variableData, (pData: IdbPredictorData) => {
            return pData.amount;
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
            if (facilityAnalysisItem.baselineYear <= year && facilityAnalysisItem.calculatedReportYear >= year) {
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
        stationaryBiogenicEmmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.stationaryBiogenicEmmissions }),
        stationaryEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.stationaryEmissions }),
        totalScope1Emissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.totalScope1Emissions }),
        totalWithMarketEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.totalWithMarketEmissions }),
        totalWithLocationEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.totalWithLocationEmissions }),
        totalBiogenicEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.totalBiogenicEmissions }),
        stationaryCarbonEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.stationaryCarbonEmissions }),
        stationaryOtherEmissions: _.sumBy(data, (mData: MonthlyData | EmissionsResults) => { return mData.stationaryOtherEmissions }),
    }
}

export function checkValueNaN(val: number): number {
    if (isNaN(val)) {
        return 0;
    }
    return val;
}

export function getYearsWithFullData(calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility): Array<number> {
    let facilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid });
    let monthlyData: Array<MonthlyData> = facilityMeters.flatMap(cMeter => { return cMeter.monthlyData });
    let years: Array<number> = monthlyData.map(mData => { return getFiscalYear(mData.date, facility) });
    let uniqueYears: Array<number> = _.uniq(years);
    uniqueYears = uniqueYears.filter(year => {
        let monthlyDataForYear: Array<MonthlyData> = monthlyData.filter(mData => { return getFiscalYear(mData.date, facility) == year });
        let months: Array<number> = monthlyDataForYear.map(mData => { return mData.date.getMonth() });
        let uniqueMonths: Array<number> = _.uniq(months);
        return uniqueMonths.length == 12;
    });
    return uniqueYears;
}

export function getLatestYearWithData(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>): number {
    let maxYearsWithFullData: Array<number> = new Array();
    facilities.forEach(facility => {
        let facilityYearsWithData: Array<number> = getYearsWithFullData(calanderizedMeters, facility);
        let facilityLatestYearWithData: number = _.max(facilityYearsWithData);

        maxYearsWithFullData.push(facilityLatestYearWithData);
    });
    if (maxYearsWithFullData.length) {
        //want the minimum year that has full data across all facilities
        return _.min(maxYearsWithFullData);
    } else {
        return undefined;
    }
}

export function getAllYearsWithData(calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility): Array<number> {
    let facilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid });
    let monthlyData: Array<MonthlyData> = facilityMeters.flatMap(cMeter => { return cMeter.monthlyData });
    let years: Array<number> = monthlyData.map(mData => { return getFiscalYear(mData.date, facility) });
    let uniqueYears: Array<number> = _.uniq(years);
    return uniqueYears;
}

export function getYearsWithFullDataAccount(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>): Array<number> {
    let yearsWithFullData: Array<number> = [];
    facilities.forEach(facility => {
        let facilityYearsWithFullData: Array<number> = getYearsWithFullData(calanderizedMeters, facility);
        yearsWithFullData = _.union(yearsWithFullData, facilityYearsWithFullData);
    });
    // Sort ascending
    return _.orderBy(yearsWithFullData, [], ['asc']);
}