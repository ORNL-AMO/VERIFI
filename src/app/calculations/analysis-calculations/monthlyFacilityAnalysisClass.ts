import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { getFiscalYear, getLastBillEntryFromCalanderizedMeterData } from "../shared-calculations/calanderizationFunctions";
import { checkAnalysisValue, getMonthlyStartAndEndDate } from "../shared-calculations/calculationsHelpers";
import { MonthlyAnalysisSummaryClass } from "./monthlyAnalysisSummaryClass";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import { MonthlyFacilityAnalysisDataClass } from "./monthlyFacilityAnalysisDataClass";
import * as _ from 'lodash';

export class MonthlyFacilityAnalysisClass {

    allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>;
    facilityMonthSummaries: Array<MonthlyFacilityAnalysisDataClass>;
    startDate: Date;
    endDate: Date;
    facilityPredictorEntries: Array<IdbPredictorEntry>;
    baselineYear: number;
    constructor(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>, calculateAllMonthlyData: boolean) {
        this.setStartAndEndDate(facility, analysisItem, calculateAllMonthlyData, calanderizedMeters);
        this.setGroupSummaries(analysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData);
        this.setFacilityPredictorEntries(accountPredictorEntries, facility);
        this.setBaselineYear(facility);
        this.setFacilityMonthSummaries(facility);
    }

    setStartAndEndDate(facility: IdbFacility, analysisItem: IdbAnalysisItem, calculateAllMonthlyData: boolean, calanderizedMeters: Array<CalanderizedMeter>) {
        let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = getMonthlyStartAndEndDate(facility, analysisItem);
        this.startDate = monthlyStartAndEndDate.baselineDate;
        if (calculateAllMonthlyData) {
            let lastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(calanderizedMeters);
            this.endDate = new Date(lastBill.date);
            this.endDate.setMonth(this.endDate.getMonth() + 1);
            this.endDate.setDate(1);
        } else {
            this.endDate = monthlyStartAndEndDate.endDate;
        }
    }

    setGroupSummaries(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>, calculateAllMonthlyData: boolean) {
        let groupMonthlySummariesClasses: Array<MonthlyAnalysisSummaryClass> = new Array();
        analysisItem.groups.forEach(group => {
            let monthlySummary: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(group, analysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData);
            groupMonthlySummariesClasses.push(monthlySummary);
        });
        this.allFacilityAnalysisData = groupMonthlySummariesClasses.flatMap(summary => { return summary.monthlyAnalysisSummaryData });
    }

    setFacilityPredictorEntries(accountPredictorEntries: Array<IdbPredictorEntry>, facility: IdbFacility) {
        this.facilityPredictorEntries = accountPredictorEntries.filter(entry => {
            return entry.facilityId == facility.guid;
        })
    }


    setBaselineYear(facility: IdbFacility) {
        this.baselineYear = getFiscalYear(this.startDate, facility);
    }

    setFacilityMonthSummaries(facility: IdbFacility) {
        this.facilityMonthSummaries = new Array();
        let monthDate: Date = new Date(this.startDate);
        while (monthDate < this.endDate) {
            let monthSummary: MonthlyFacilityAnalysisDataClass = new MonthlyFacilityAnalysisDataClass(
                this.allFacilityAnalysisData,
                monthDate,
                this.facilityPredictorEntries,
                this.facilityMonthSummaries,
                this.baselineYear,
                facility
            );
            this.facilityMonthSummaries.push(monthSummary);
            let currentMonth: number = monthDate.getUTCMonth()
            let nextMonth: number = currentMonth + 1;
            monthDate = new Date(monthDate.getUTCFullYear(), nextMonth, 1);
        }
    }



    getMonthlyAnalysisSummaryData(): Array<MonthlyAnalysisSummaryData> {
        return this.facilityMonthSummaries.map(summaryDataItem => {
            return {
                date: summaryDataItem.date,
                energyUse: summaryDataItem.energyUse,
                modeledEnergy: summaryDataItem.modeledEnergy,
                adjustedForNormalization: summaryDataItem.monthlyAnalysisCalculatedValues.adjustedForNormalization,
                adjusted: summaryDataItem.monthlyAnalysisCalculatedValues.adjusted,
                baselineAdjustmentForNormalization: summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustmentForNormalization,
                baselineAdjustmentForOther: summaryDataItem.baselineAdjustmentForOther,
                baselineAdjustment: summaryDataItem.monthlyAnalysisCalculatedValues.baselineAdjustment,
                predictorUsage: summaryDataItem.predictorUsage,
                fiscalYear: summaryDataItem.fiscalYear,
                group: undefined,
                SEnPI: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.SEnPI),
                savings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.savings),
                percentSavingsComparedToBaseline: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.percentSavingsComparedToBaseline) * 100,
                yearToDateSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDateSavings),
                yearToDatePercentSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDatePercentSavings) * 100,
                rollingSavings: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rollingSavings),
                rolling12MonthImprovement: checkAnalysisValue(summaryDataItem.monthlyAnalysisCalculatedValues.rolling12MonthImprovement) * 100,
            }
        })
    }
}