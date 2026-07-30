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
import { getIsEnergyMeter } from "src/app/shared/sharedHelperFunctions";

export function getMonthlyStartAndEndDate(
    facilityOrAccount: IdbFacility | IdbAccount,
    analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem,
    group: AnalysisGroup,
    reportYear: number
): { baselineDate: Date, endDate: Date, bankedAnalysisDate: Date } {
    let baselineDate: Date;
    let endDate: Date;
    let bankedAnalysisDate: Date;
    let baselineYear: number = analysisItem.baselineYear;
    if (group && group.applyBanking && analysisItem.hasBanking) {
        baselineYear = group.newBaselineYear;
    }

    if (facilityOrAccount.fiscalYear == 'calendarYear') {
        baselineDate = new Date(baselineYear, 0, 1);
        endDate = new Date(reportYear + 1, 0, 1);
        if (analysisItem.hasBanking && group && group.applyBanking) {
            bankedAnalysisDate = new Date(group.bankedAnalysisYear + 1, 0, 1);
        }
    } else {
        if (facilityOrAccount.fiscalYearCalendarEnd) {
            baselineDate = new Date(baselineYear - 1, facilityOrAccount.fiscalYearMonth);
            endDate = new Date(reportYear, facilityOrAccount.fiscalYearMonth);
            if (analysisItem.hasBanking && group && group.applyBanking) {
                bankedAnalysisDate = new Date(group.bankedAnalysisYear, facilityOrAccount.fiscalYearMonth);
            }
        } else {
            baselineDate = new Date(baselineYear, facilityOrAccount.fiscalYearMonth);
            endDate = new Date(reportYear + 1, facilityOrAccount.fiscalYearMonth);
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

export function getIncludedMeters(
    meters: Array<IdbUtilityMeter>,
    selectedAnalysisItem: IdbAccountAnalysisItem,
    accountAnalysisItems: Array<IdbAnalysisItem>,
    year: number,
    reportYear: number
) {
    let includedMeters: Array<IdbUtilityMeter> = new Array()
    selectedAnalysisItem.facilityAnalysisItems.forEach(item => {
        if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
            let facilityAnalysisItem: IdbAnalysisItem = accountAnalysisItems.find(accountItem => { return accountItem.guid == item.analysisItemId });
            if (facilityAnalysisItem.baselineYear <= year && reportYear >= year) {
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

export function getYearsWithFullDataAccount(calanderizedMeters: Array<CalanderizedMeter>, account: IdbAccount): Array<number> {
    let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => { return cMeter.monthlyData });
    let years: Array<number> = monthlyData.map(mData => { return getFiscalYear(mData.date, account) });
    let uniqueYears: Array<number> = _.uniq(years);
    uniqueYears = uniqueYears.filter(year => {
        let monthlyDataForYear: Array<MonthlyData> = monthlyData.filter(mData => { return getFiscalYear(mData.date, account) == year });
        let months: Array<number> = monthlyDataForYear.map(mData => { return mData.date.getMonth() });
        let uniqueMonths: Array<number> = _.uniq(months);
        return uniqueMonths.length == 12;
    });
    return _.sortBy(uniqueYears);
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
    return _.sortBy(uniqueYears);
}

export function getIncludedAnalysisInputIds(
    groups: Array<AnalysisGroup>,
    calanderizedMeters: Array<CalanderizedMeter>
): { includedMeterIds: Array<string>, includedPredictorIds: Array<string> } {
    const includedMeterIds = new Set<string>();
    const includedPredictorIds = new Set<string>();

    groups.forEach(group => {
        if (group.analysisType === 'skip' || group.analysisType === 'skipAnalysis') {
            return;
        }

        calanderizedMeters
            .filter(calanderizedMeter =>
                calanderizedMeter.meter.groupId === group.idbGroupId &&
                !calanderizedMeter.meter.noLongerInUse
            )
            .forEach(calanderizedMeter => includedMeterIds.add(calanderizedMeter.meter.guid));

        if (group.analysisType === 'energyIntensity' || group.analysisType === 'modifiedEnergyIntensity') {
            group.predictorVariables
                .filter(variable => variable.productionInAnalysis && variable.id)
                .forEach(variable => includedPredictorIds.add(variable.id));
        } else if (group.analysisType === 'regression') {
            if (group.isGeneratedModel) {
                const selectedModel = group.models?.find(model => model.modelId === group.selectedModelId);
                selectedModel?.predictorVariables
                    .filter(variable => variable.id)
                    .forEach(variable => includedPredictorIds.add(variable.id));
            } else {
                group.predictorVariables
                    .filter(variable => variable.productionInAnalysis && variable.id)
                    .forEach(variable => includedPredictorIds.add(variable.id));
            }
        }
    });

    return {
        includedMeterIds: Array.from(includedMeterIds),
        includedPredictorIds: Array.from(includedPredictorIds)
    };
}

/**
 * Finds the latest fiscal year for which every considered input has a complete year.
 * Inputs without any complete year are ignored to preserve account-analysis behavior.
 */
export function getLatestCompleteAnalysisYear(
    groups: Array<AnalysisGroup>,
    calanderizedMeters: Array<CalanderizedMeter>,
    predictorData: Array<IdbPredictorData>,
    facilities: Array<IdbFacility>
): number | undefined {
    const { includedMeterIds, includedPredictorIds } = getIncludedAnalysisInputIds(groups, calanderizedMeters);
    const latestCompleteYears: Array<number> = [];

    includedMeterIds.forEach(meterId => {
        const calanderizedMeter = calanderizedMeters.find(meter => meter.meter.guid === meterId);
        const facility = facilities.find(item => item.guid === calanderizedMeter?.meter.facilityId);
        if (!calanderizedMeter || !facility) {
            return;
        }

        const latestCompleteYear = _.max(getYearsWithFullData([calanderizedMeter], facility));
        if (latestCompleteYear !== undefined) {
            latestCompleteYears.push(latestCompleteYear);
        }
    });

    includedPredictorIds.forEach(predictorId => {
        const entries = predictorData.filter(entry => entry.predictorId === predictorId);
        const facility = facilities.find(item => item.guid === entries[0]?.facilityId);
        if (entries.length === 0 || !facility) {
            return;
        }

        const monthsByFiscalYear = new Map<number, Set<number>>();
        entries.forEach(entry => {
            const fiscalYear = getFiscalYear(getDateFromPredictorData(entry), facility);
            const months = monthsByFiscalYear.get(fiscalYear) ?? new Set<number>();
            months.add(entry.month);
            monthsByFiscalYear.set(fiscalYear, months);
        });

        const completeYears = Array.from(monthsByFiscalYear.entries())
            .filter(([, months]) => months.size === 12)
            .map(([year]) => year);
        const latestCompleteYear = _.max(completeYears);
        if (latestCompleteYear !== undefined) {
            latestCompleteYears.push(latestCompleteYear);
        }
    });

    return latestCompleteYears.length > 0 ? _.min(latestCompleteYears) : undefined;
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
    return _.sortBy(uniqueYears);
}

export function getAllYearsWithDataAccount(calanderizedMeters: Array<CalanderizedMeter>, account: IdbAccount): Array<number> {
    let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => { return cMeter.monthlyData });
    let years: Array<number> = monthlyData.map(mData => { return getFiscalYear(mData.date, account) });
    let uniqueYears: Array<number> = _.uniq(years);
    return _.sortBy(uniqueYears);
}

export function getLatestDataDate(calanderizedMeters: Array<CalanderizedMeter>): Date {
    let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => { return cMeter.monthlyData });
    let dates: Array<Date> = monthlyData.map(mData => { return new Date(mData.year, mData.monthNumValue, 1) });
    return _.max(dates);
}

export function getYearsWithFullDataAnalysis(calanderizedMeters: Array<CalanderizedMeter>, analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<number> {
    const filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(calanderizedMeter => {
        return calanderizedMeter.meter.facilityId == analysisItem.facilityId && isCategoryMeter(calanderizedMeter.meter, analysisItem.analysisCategory);
    });
    return getYearsWithFullData(filteredMeters, facility);
}

export function getYearsWithFullDataAccountAnalysis(calanderizedMeters: Array<CalanderizedMeter>, analysisItem: IdbAccountAnalysisItem, account: IdbAccount): Array<number> {
    const filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(calanderizedMeter => {
        return isCategoryMeter(calanderizedMeter.meter, analysisItem.analysisCategory);
    });
    return getYearsWithFullDataAccount(filteredMeters, account);
}

export function isCategoryMeter(meter: IdbUtilityMeter, meterCategory: 'water' | 'energy' | 'all'): boolean {
    if (meterCategory == 'water') {
        if (meter.source == 'Water Intake') {
            return true;
        }
        return false;
    } else if (meterCategory == 'energy') {
        return getIsEnergyMeter(meter.source);
    } else if (meterCategory == 'all') {
        return true;
    }
}
