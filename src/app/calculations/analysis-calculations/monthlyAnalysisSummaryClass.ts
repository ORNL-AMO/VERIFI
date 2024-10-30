import { AnalysisGroup, MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { checkAnalysisValue } from "../shared-calculations/calculationsHelpers";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import { MonthlyGroupAnalysisClass } from "./monthlyGroupAnalysisClass";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { checkSameMonth } from "src/app/upload-data/upload-helper-functions";
import * as _ from 'lodash';
import { getFiscalYear } from "../shared-calculations/calanderizationFunctions";

export class MonthlyAnalysisSummaryClass {

    bankedMonthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass
    lastBankedMonthSummaryData: MonthlyAnalysisSummaryDataClass;

    monthlyGroupAnalysisClass: MonthlyGroupAnalysisClass;
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryDataClass>;
    group: AnalysisGroup;
    facility: IdbFacility;
    constructor(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, calculateAllMonthlyData: boolean, accountAnalysisItems: Array<IdbAnalysisItem>) {
        this.group = selectedGroup;
        this.facility = facility;
        if (analysisItem.hasBanking && this.group.applyBanking) {
            let bankedAnalysisItem: IdbAnalysisItem = accountAnalysisItems.find(item => {
                return item.guid == analysisItem.bankedAnalysisItemId
            });
            let bankedGroup: AnalysisGroup = bankedAnalysisItem.groups.find(group => {
                return group.idbGroupId == this.group.idbGroupId;
            });
            let bankedAnalysisCpy: IdbAnalysisItem = JSON.parse(JSON.stringify(bankedAnalysisItem));
            bankedAnalysisCpy.reportYear = this.group.bankedAnalysisYear;
            this.bankedMonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(bankedGroup, bankedAnalysisCpy, this.facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData, accountAnalysisItems);
            this.setBankedMonthlyAnalysisSummaryData(this.bankedMonthlyAnalysisSummaryClass, selectedGroup.bankedAnalysisYear);
        }
        this.monthlyGroupAnalysisClass = new MonthlyGroupAnalysisClass(selectedGroup, analysisItem, this.facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData);
        this.setMonthlyAnalysisSummaryData();
    }

    setMonthlyAnalysisSummaryData() {
        this.monthlyAnalysisSummaryData = new Array();
        let startDate: Date;
        if (this.monthlyGroupAnalysisClass.bankedAnalysisDate) {
            startDate = new Date(this.monthlyGroupAnalysisClass.bankedAnalysisDate);
        } else {
            startDate = new Date(this.monthlyGroupAnalysisClass.baselineDate);
        }
        while (startDate < this.monthlyGroupAnalysisClass.endDate) {
            let monthlyAnalysisSummaryDataClass: MonthlyAnalysisSummaryDataClass = new MonthlyAnalysisSummaryDataClass(this.monthlyGroupAnalysisClass, startDate, this.monthlyAnalysisSummaryData, this.facility, this.lastBankedMonthSummaryData)
            this.monthlyAnalysisSummaryData.push(monthlyAnalysisSummaryDataClass);
            let currentMonth: number = startDate.getUTCMonth()
            let nextMonth: number = currentMonth + 1;
            startDate = new Date(startDate.getUTCFullYear(), nextMonth, 1);
        }
    }

    setBankedMonthlyAnalysisSummaryData(bankedMonthlyGroupAnalysisClass: MonthlyAnalysisSummaryClass, bankedAnalysisYear: number) {
        let bankedMonthlyAnalysisSummaryData = bankedMonthlyGroupAnalysisClass.monthlyAnalysisSummaryData;
        let previousYearMonthlySummaryData: Array<MonthlyAnalysisSummaryDataClass> = bankedMonthlyAnalysisSummaryData.filter(data => {
            return data.fiscalYear == bankedAnalysisYear;
        });
        this.lastBankedMonthSummaryData = _.maxBy(previousYearMonthlySummaryData, (summaryData: MonthlyAnalysisSummaryDataClass) => {
            return new Date(summaryData.date)
        });
    }

    getResults(): MonthlyAnalysisSummary {
        let unbankedMonthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = this.getUnbankedMonthlyAnalysisSummaryData();
        let bankedMonthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = this.getBankedMonthlyAnalysisSummaryData();
        return {
            predictorVariables: this.monthlyGroupAnalysisClass.predictorVariables,
            monthlyAnalysisSummaryData: this.getMonthlyAnalysisSummaryData(unbankedMonthlyAnalysisSummaryData, bankedMonthlyAnalysisSummaryData),
            unbankedMonthlyAnalysisSummaryData: unbankedMonthlyAnalysisSummaryData,
            bankedMonthlyAnalysisSummaryData: bankedMonthlyAnalysisSummaryData,
            modelYear: undefined,
            group: this.group
        }
    }


    getMonthlyAnalysisSummaryData(unbankedMonthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>, bankedMonthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>): Array<MonthlyAnalysisSummaryData> {
        if (bankedMonthlyAnalysisSummaryData && bankedMonthlyAnalysisSummaryData.length > 0) {
            let startUnbankedDate: Date = new Date(unbankedMonthlyAnalysisSummaryData[0].date);
            let startBankedDate: Date = new Date(bankedMonthlyAnalysisSummaryData[0].date);
            let combinedData: Array<MonthlyAnalysisSummaryData> = new Array();
            while (startBankedDate < startUnbankedDate) {
                let bankedData: MonthlyAnalysisSummaryData = bankedMonthlyAnalysisSummaryData.find(data => {
                    return checkSameMonth(new Date(data.date), startBankedDate);
                });
                bankedData.isBanked = true;
                combinedData.push(bankedData);
                let currentMonth: number = startBankedDate.getUTCMonth()
                let nextMonth: number = currentMonth + 1;
                startBankedDate = new Date(startBankedDate.getUTCFullYear(), nextMonth, 1);
            }
            unbankedMonthlyAnalysisSummaryData.forEach(data => {
                combinedData.push(data);
            });
            return combinedData;
        } else {
            return unbankedMonthlyAnalysisSummaryData;
        }
    }

    getUnbankedMonthlyAnalysisSummaryData(): Array<MonthlyAnalysisSummaryData> {
        return this.monthlyAnalysisSummaryData.map(summaryDataItem => {
            return {
                date: summaryDataItem.date,
                energyUse: summaryDataItem.energyUse,
                modeledEnergy: summaryDataItem.modeledEnergy,
                adjusted: summaryDataItem.monthlyAnalysisCalculatedValues.adjusted,
                baselineAdjustmentForNormalization: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustmentForNormalization),
                baselineAdjustmentForOtherV2: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustmentForOtherV2),
                baselineAdjustment: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustment),
                predictorUsage: summaryDataItem.predictorUsage,
                fiscalYear: summaryDataItem.fiscalYear,
                group: summaryDataItem.group,
                SEnPI: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.SEnPI),
                savings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.savings),
                percentSavingsComparedToBaseline: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.percentSavingsComparedToBaseline) * 100,
                yearToDateSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDateSavings),
                yearToDatePercentSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDatePercentSavings) * 100,
                rollingSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rollingSavings),
                rolling12MonthImprovement: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rolling12MonthImprovement) * 100,
                modelYearDataAdjustment: summaryDataItem.modelYearDataAdjustment,
                dataAdjustment: summaryDataItem.dataAdjustment,
                adjustedStar: summaryDataItem.monthlyAnalysisCalculatedValues.adjustedStar,
                adjustedStarStar: summaryDataItem.monthlyAnalysisCalculatedValues.adjustedStarStar,
                baselineAdjustmentInput: summaryDataItem.baselineAdjustmentInput,
                isBanked: summaryDataItem.isBankedAnalysis,
                isIntermediateBanked: summaryDataItem.isBankedAnalysis
            }
        })
    }

    getBankedMonthlyAnalysisSummaryData(): Array<MonthlyAnalysisSummaryData> {
        if (this.bankedMonthlyAnalysisSummaryClass) {
            let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = this.bankedMonthlyAnalysisSummaryClass.getResults().monthlyAnalysisSummaryData;
            return monthlyAnalysisSummaryData.map(data => {
                data.isBanked = true;
                return data;
            })
        } else {
            return [];
        }
    }
}