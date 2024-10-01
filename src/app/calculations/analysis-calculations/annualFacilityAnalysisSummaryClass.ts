import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { AnnualAnalysisSummaryDataClass } from "./annualAnalysisSummaryDataClass";
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { MonthlyFacilityAnalysisClass } from "./monthlyFacilityAnalysisClass";
import { checkAnalysisValue } from "../shared-calculations/calculationsHelpers";
import { MonthlyAnalysisSummaryClass } from "./monthlyAnalysisSummaryClass";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";

export class AnnualFacilityAnalysisSummaryClass {

    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    annualAnalysisSummaryDataClasses: Array<AnnualAnalysisSummaryDataClass>;
    groupMonthlySummariesClasses: Array<MonthlyAnalysisSummaryClass>
    baselineYear: number;
    reportYear: number;
    constructor(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, calculateAllMonthlyData: boolean, accountPredictors: Array<IdbPredictor>, bankedAnalysisItem: IdbAnalysisItem) {
        this.setMonthlyAnalysisSummaryData(analysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData, accountPredictors, bankedAnalysisItem);
        this.setBaselineYear(analysisItem);
        this.setReportYear(analysisItem);
        this.setAnnualAnalysisSummaryDataClasses(accountPredictorEntries, facility, accountPredictors);
    }

    setMonthlyAnalysisSummaryData(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, calculateAllMonthlyData: boolean, accountPredictors: Array<IdbPredictor>, bankedAnalysisItem: IdbAnalysisItem) {
        let monthlyAnalysisSummaryClass: MonthlyFacilityAnalysisClass = new MonthlyFacilityAnalysisClass(analysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData, accountPredictors, bankedAnalysisItem);
        this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getMonthlyAnalysisSummaryData();
        this.groupMonthlySummariesClasses = monthlyAnalysisSummaryClass.groupMonthlySummariesClasses;
    }

    setBaselineYear(analysisItem: IdbAnalysisItem) {
        this.baselineYear = analysisItem.baselineYear;
    }

    setReportYear(analysisItem: IdbAnalysisItem) {
        this.reportYear = analysisItem.reportYear;
    }


    setAnnualAnalysisSummaryDataClasses(accountPredictorEntries: Array<IdbPredictorData>, facility: IdbFacility, accountPredictors: Array<IdbPredictor>) {
        this.annualAnalysisSummaryDataClasses = new Array();
        let analysisYear: number = this.baselineYear;
        while (analysisYear <= this.reportYear) {
            let yearAnalysisSummaryDataClass: AnnualAnalysisSummaryDataClass = new AnnualAnalysisSummaryDataClass(this.monthlyAnalysisSummaryData, analysisYear, accountPredictorEntries, facility, this.annualAnalysisSummaryDataClasses, accountPredictors);
            this.annualAnalysisSummaryDataClasses.push(yearAnalysisSummaryDataClass);
            analysisYear++;
        }
    }

    getAnnualAnalysisSummaries(): Array<AnnualAnalysisSummary> {
        return this.annualAnalysisSummaryDataClasses.map(summaryDataClass => {
            return {
                year: summaryDataClass.year,
                energyUse: summaryDataClass.energyUse,
                adjusted: summaryDataClass.adjusted,
                baselineAdjustmentForNormalization: checkAnalysisValue(summaryDataClass.baselineAdjustmentForNormalization),
                baselineAdjustmentForOtherV2: checkAnalysisValue(summaryDataClass.baselineAdjustmentForOtherV2),
                baselineAdjustment: checkAnalysisValue(summaryDataClass.baselineAdjustment),
                SEnPI: checkAnalysisValue(summaryDataClass.SEnPI),
                savings: checkAnalysisValue(summaryDataClass.savings),
                totalSavingsPercentImprovement: checkAnalysisValue(summaryDataClass.totalSavingsPercentImprovement) * 100,
                annualSavingsPercentImprovement: checkAnalysisValue(summaryDataClass.annualSavingsPercentImprovement) * 100,
                cummulativeSavings: checkAnalysisValue(summaryDataClass.cummulativeSavings),
                newSavings: checkAnalysisValue(summaryDataClass.newSavings),
                predictorUsage: summaryDataClass.predictorUsage,
            }
        })
    }
}