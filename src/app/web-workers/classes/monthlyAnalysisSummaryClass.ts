import { MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { HelperService } from "./helperService";
import { MonthlyAnalysisSummaryDataClass } from "./monthlyAnalysisSummaryDataClass";
import { MonthlyGroupAnalysisClass } from "./monthlyGroupAnalysisClass";

export class MonthlyAnalysisSummaryClass {

    monthlyGroupAnalysisClass: MonthlyGroupAnalysisClass;
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryDataClass>;
    helperService: HelperService;
    constructor(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
        this.helperService = new HelperService();
        this.monthlyGroupAnalysisClass = new MonthlyGroupAnalysisClass(selectedGroup, analysisItem, facility, calanderizedMeters, accountPredictorEntries);
        this.setMonthlyAnalysisSummaryData();
    }

    setMonthlyAnalysisSummaryData() {
        this.monthlyAnalysisSummaryData = new Array();
        let baselineDate: Date = new Date(this.monthlyGroupAnalysisClass.baselineDate);
        while (baselineDate < this.monthlyGroupAnalysisClass.endDate) {
            // let monthlyanalysisSummaryDataCopy: Array<MonthlyAnalysisSummaryDataClass> = JSON.parse(JSON.stringify(this.monthlyAnalysisSummaryData))
            let monthlyAnalysisSummaryDataClass: MonthlyAnalysisSummaryDataClass = new MonthlyAnalysisSummaryDataClass(this.monthlyGroupAnalysisClass, baselineDate, this.monthlyAnalysisSummaryData)
            this.monthlyAnalysisSummaryData.push(monthlyAnalysisSummaryDataClass);
            let currentMonth: number = baselineDate.getUTCMonth()
            let nextMonth: number = currentMonth + 1;
            baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
        }
    }


    getResults(): MonthlyAnalysisSummary {
        return {
            predictorVariables: this.monthlyGroupAnalysisClass.predictorVariables,
            monthlyAnalysisSummaryData: this.getMonthlyAnalysisSummaryData(),
            modelYear: undefined,
        }
    }

    getMonthlyAnalysisSummaryData(): Array<MonthlyAnalysisSummaryData> {
        return this.monthlyAnalysisSummaryData.map(summaryDataItem => {
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
                group: summaryDataItem.group,
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