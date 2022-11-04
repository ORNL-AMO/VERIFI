import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { HelperService } from "./helperService";
import { MonthlyAnalysisSummaryClass } from "./monthlyAnalysisSummaryClass";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import { MonthlyFacilityAnalysisDataClass } from "./monthlyFacilityAnalysisDataClass";

export class MonthlyFacilityAnalysisClass {

    allFacilityAnalysisData: Array<MonthlyAnalysisSummaryDataClass>;
    facilityMonthSummaries: Array<MonthlyFacilityAnalysisDataClass>;
    startDate: Date;
    endDate: Date;
    helperService: HelperService;
    facilityPredictorEntries: Array<IdbPredictorEntry>;
    baselineYear: number;
    constructor(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
        this.helperService = new HelperService();
        this.setStartAndEndDate(facility, analysisItem);
        this.setGroupSummaries(analysisItem, facility, calanderizedMeters, accountPredictorEntries);
        this.setFacilityPredictorEntries(accountPredictorEntries, facility);
        this.setBaselineYear(facility);
        this.setFacilityMonthSummaries(facility);
    }

    setStartAndEndDate(facility: IdbFacility, analysisItem: IdbAnalysisItem) {
        let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.helperService.getMonthlyStartAndEndDate(facility, analysisItem);
        this.startDate = monthlyStartAndEndDate.baselineDate;
        this.endDate = monthlyStartAndEndDate.endDate;
    }

    setGroupSummaries(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
        let groupMonthlySummariesClasses: Array<MonthlyAnalysisSummaryClass> = new Array();
        analysisItem.groups.forEach(group => {
            let monthlySummary: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(group, analysisItem, facility, calanderizedMeters, accountPredictorEntries);
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
        this.baselineYear = this.helperService.getFiscalYear(this.startDate, facility);
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
                SEnPI: this.helperService.checkValue(summaryDataItem.monthlyAnalysisCalculatedValues.SEnPI),
                savings: this.helperService.checkValue(summaryDataItem.monthlyAnalysisCalculatedValues.savings),
                percentSavingsComparedToBaseline: this.helperService.checkValue(summaryDataItem.monthlyAnalysisCalculatedValues.percentSavingsComparedToBaseline) * 100,
                yearToDateSavings: this.helperService.checkValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDateSavings),
                yearToDatePercentSavings: this.helperService.checkValue(summaryDataItem.monthlyAnalysisCalculatedValues.yearToDatePercentSavings) * 100,
                rollingSavings: this.helperService.checkValue(summaryDataItem.monthlyAnalysisCalculatedValues.rollingSavings),
                rolling12MonthImprovement: this.helperService.checkValue(summaryDataItem.monthlyAnalysisCalculatedValues.rolling12MonthImprovement) * 100,
            }
        })
    }
}