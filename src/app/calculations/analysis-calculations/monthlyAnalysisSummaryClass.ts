import { AnalysisGroup, MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { checkAnalysisValue } from "../shared-calculations/calculationsHelpers";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import { MonthlyGroupAnalysisClass } from "./monthlyGroupAnalysisClass";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { checkSameMonth } from "src/app/upload-data/upload-helper-functions";

export class MonthlyAnalysisSummaryClass {


    bankedMonthlyGroupAnalysisClass: MonthlyGroupAnalysisClass;
    bankedMonthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryDataClass>;
    lastBankedMonthSummaryData: MonthlyAnalysisSummaryDataClass;

    monthlyGroupAnalysisClass: MonthlyGroupAnalysisClass;
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryDataClass>;
    group: AnalysisGroup;
    constructor(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, calculateAllMonthlyData: boolean, bankedAnalysisItem: IdbAnalysisItem) {
        this.group = selectedGroup;
        if (this.group.applyBanking) {
            this.bankedMonthlyGroupAnalysisClass = new MonthlyGroupAnalysisClass(selectedGroup, bankedAnalysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData);
            this.setBankedMonthlyAnalysisSummaryData(facility, this.bankedMonthlyGroupAnalysisClass, analysisItem.baselineYear);
        }
        this.monthlyGroupAnalysisClass = new MonthlyGroupAnalysisClass(selectedGroup, analysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData);
        this.setMonthlyAnalysisSummaryData(facility);
    }

    setMonthlyAnalysisSummaryData(facility: IdbFacility) {
        this.monthlyAnalysisSummaryData = new Array();
        let baselineDate: Date = new Date(this.monthlyGroupAnalysisClass.baselineDate);
        while (baselineDate < this.monthlyGroupAnalysisClass.endDate) {
            let monthlyAnalysisSummaryDataClass: MonthlyAnalysisSummaryDataClass = new MonthlyAnalysisSummaryDataClass(this.monthlyGroupAnalysisClass, baselineDate, this.monthlyAnalysisSummaryData, facility, this.lastBankedMonthSummaryData)
            this.monthlyAnalysisSummaryData.push(monthlyAnalysisSummaryDataClass);
            let currentMonth: number = baselineDate.getUTCMonth()
            let nextMonth: number = currentMonth + 1;
            baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
        }
    }

    setBankedMonthlyAnalysisSummaryData(facility: IdbFacility, bankedMonthlyGroupAnalysisClass: MonthlyGroupAnalysisClass, newBaselineYear: number) {
        this.bankedMonthlyAnalysisSummaryData = new Array();
        let baselineDate: Date = new Date(bankedMonthlyGroupAnalysisClass.baselineDate);
        //TODO: not sure we need to go all the way to end date and not just new baseline date..
        while (baselineDate < bankedMonthlyGroupAnalysisClass.endDate) {
            let monthlyAnalysisSummaryDataClass: MonthlyAnalysisSummaryDataClass = new MonthlyAnalysisSummaryDataClass(bankedMonthlyGroupAnalysisClass, baselineDate, this.bankedMonthlyAnalysisSummaryData, facility, undefined)
            this.bankedMonthlyAnalysisSummaryData.push(monthlyAnalysisSummaryDataClass);
            let currentMonth: number = baselineDate.getUTCMonth()
            let nextMonth: number = currentMonth + 1;
            baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
        }
        let previousYearMonthlySummaryData: Array<MonthlyAnalysisSummaryDataClass> = this.bankedMonthlyAnalysisSummaryData.filter(data => {
            return data.fiscalYear == (newBaselineYear - 1);
        });
        //TODO: better way to do this..
        this.lastBankedMonthSummaryData = previousYearMonthlySummaryData[previousYearMonthlySummaryData.length - 1];
        console.log(this.lastBankedMonthSummaryData.date);
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
        //TODO: add banked monthly readings.
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
                rolling12MonthImprovementBanked: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rolling12MonthImprovementBanked) * 100,
                rolling12MonthImprovementUnbanked: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rolling12MonthImprovementUnbanked) * 100,
                modelYearDataAdjustment: summaryDataItem.modelYearDataAdjustment,
                dataAdjustment: summaryDataItem.dataAdjustment,
                adjustedStar: summaryDataItem.monthlyAnalysisCalculatedValues.adjustedStar,
                adjustedStarStar: summaryDataItem.monthlyAnalysisCalculatedValues.adjustedStarStar,
                baselineAdjustmentInput: summaryDataItem.baselineAdjustmentInput,
                isBanked: false
            }
        })
    }

    getBankedMonthlyAnalysisSummaryData(): Array<MonthlyAnalysisSummaryData> {
        //TODO: add banked monthly readings.
        if (this.bankedMonthlyAnalysisSummaryData) {
            return this.bankedMonthlyAnalysisSummaryData.map(summaryDataItem => {
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
                    rolling12MonthImprovementBanked: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rolling12MonthImprovementBanked) * 100,
                    rolling12MonthImprovementUnbanked: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rolling12MonthImprovementUnbanked) * 100,
                    modelYearDataAdjustment: summaryDataItem.modelYearDataAdjustment,
                    dataAdjustment: summaryDataItem.dataAdjustment,
                    adjustedStar: summaryDataItem.monthlyAnalysisCalculatedValues.adjustedStar,
                    adjustedStarStar: summaryDataItem.monthlyAnalysisCalculatedValues.adjustedStarStar,
                    baselineAdjustmentInput: summaryDataItem.baselineAdjustmentInput,
                    isBanked: true
                }
            })
        } else {
            return [];
        }
    }
}