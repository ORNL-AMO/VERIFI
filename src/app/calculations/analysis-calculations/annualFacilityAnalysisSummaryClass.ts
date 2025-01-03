import { AnalysisGroup, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
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
    groupSummaries: Array<{
        group: AnalysisGroup,
        monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
        annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
    }>;
    baselineYear: number;
    reportYear: number;
    constructor(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, calculateAllMonthlyData: boolean, accountPredictors: Array<IdbPredictor>, accountAnalysisItems: Array<IdbAnalysisItem>, includeGroupSummaries: boolean) {
        this.setBaselineYear(analysisItem);
        this.setReportYear(analysisItem);
        this.setMonthlyAnalysisSummaryData(analysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData, accountPredictors, accountAnalysisItems, includeGroupSummaries);
        this.setAnnualAnalysisSummaryDataClasses(accountPredictorEntries, facility, accountPredictors);
    }

    setMonthlyAnalysisSummaryData(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, calculateAllMonthlyData: boolean, accountPredictors: Array<IdbPredictor>, accountAnalysisItems: Array<IdbAnalysisItem>, includeGroupSummaries: boolean) {
        let monthlyAnalysisSummaryClass: MonthlyFacilityAnalysisClass = new MonthlyFacilityAnalysisClass(analysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData, accountPredictors, accountAnalysisItems);
        this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getMonthlyAnalysisSummaryData();
        if (includeGroupSummaries) {
            this.setGroupMonthlyAnalysis(monthlyAnalysisSummaryClass.groupMonthlySummariesClasses, accountPredictorEntries, facility, accountPredictors)
        }
    }

    setGroupMonthlyAnalysis(groupMonthlySummariesClasses: Array<MonthlyAnalysisSummaryClass>, accountPredictorEntries: Array<IdbPredictorData>, facility: IdbFacility, accountPredictors: Array<IdbPredictor>) {
        this.groupSummaries = new Array();
        groupMonthlySummariesClasses.forEach(groupMonthlySummariesClass => {
            let analysisYear: number = this.baselineYear;
            let annualAnalysisSummaryDataClasses: Array<AnnualAnalysisSummaryDataClass> = new Array();
            let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = groupMonthlySummariesClass.getResults().monthlyAnalysisSummaryData
            while (analysisYear <= this.reportYear) {
                let yearAnalysisSummaryDataClass: AnnualAnalysisSummaryDataClass = new AnnualAnalysisSummaryDataClass(monthlyAnalysisSummaryData, analysisYear, accountPredictorEntries, facility, annualAnalysisSummaryDataClasses, accountPredictors);
                annualAnalysisSummaryDataClasses.push(yearAnalysisSummaryDataClass);
                analysisYear++;
            }
            this.groupSummaries.push({
                group: groupMonthlySummariesClass.group,
                monthlyAnalysisSummaryData: monthlyAnalysisSummaryData,
                annualAnalysisSummaryData: annualAnalysisSummaryDataClasses.map(annualDataClass => {
                    return annualDataClass.getFormattedResult()
                })
            })
        })
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
                isBanked: false,
                isIntermediateBanked: false,
                savingsBanked: checkAnalysisValue(summaryDataClass.savingsBanked),
                savingsUnbanked: checkAnalysisValue(summaryDataClass.savingsUnbanked)
            }
        })
    }
}