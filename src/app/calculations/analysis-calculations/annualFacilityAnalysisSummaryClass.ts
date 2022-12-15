import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccount, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { AnnualAnalysisSummaryDataClass } from "./annualAnalysisSummaryDataClass";
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { MonthlyFacilityAnalysisClass } from "./monthlyFacilityAnalysisClass";
import { checkAnalysisValue } from "../shared-calculations/calculationsHelpers";

export class AnnualFacilityAnalysisSummaryClass {

    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    annualAnalysisSummaryDataClasses: Array<AnnualAnalysisSummaryDataClass>;
    baselineYear: number;
    reportYear: number;
    constructor(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>, calculateAllMonthlyData: boolean) {
        this.setMonthlyAnalysisSummaryData(analysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData);
        this.setBaselineYear(facility);
        this.setReportYear(analysisItem);
        this.setAnnualAnalysisSummaryDataClasses(accountPredictorEntries, facility);
    }

    setMonthlyAnalysisSummaryData(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>, calculateAllMonthlyData: boolean) {
        let monthlyAnalysisSummaryClass: MonthlyFacilityAnalysisClass = new MonthlyFacilityAnalysisClass(analysisItem, facility, calanderizedMeters, accountPredictorEntries, calculateAllMonthlyData);
        this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getMonthlyAnalysisSummaryData();
    }

    setBaselineYear(facilityOrAccount: IdbFacility | IdbAccount) {
        this.baselineYear = facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear;
    }

    setReportYear(analysisItem: IdbAnalysisItem) {
        this.reportYear = analysisItem.reportYear;
    }


    setAnnualAnalysisSummaryDataClasses(accountPredictorEntries: Array<IdbPredictorEntry>, facility: IdbFacility) {
        this.annualAnalysisSummaryDataClasses = new Array();
        let analysisYear: number = this.baselineYear;
        while (analysisYear <= this.reportYear) {
            let yearAnalysisSummaryDataClass: AnnualAnalysisSummaryDataClass = new AnnualAnalysisSummaryDataClass(this.monthlyAnalysisSummaryData, analysisYear, accountPredictorEntries, facility, this.annualAnalysisSummaryDataClasses);
            this.annualAnalysisSummaryDataClasses.push(yearAnalysisSummaryDataClass);
            analysisYear++;
        }
    }

    getAnnualAnalysisSummaries(): Array<AnnualAnalysisSummary> {
        return this.annualAnalysisSummaryDataClasses.map(summaryDataClass => {
            return {
                year: summaryDataClass.year,
                energyUse: summaryDataClass.energyUse,
                modeledEnergy: summaryDataClass.modeledEnergy,
                adjustedForNormalization: summaryDataClass.adjustedForNormalization,
                adjusted: summaryDataClass.adjusted,
                baselineAdjustmentForNormalization: summaryDataClass.baselineAdjustmentForNormalization,
                baselineAdjustmentForOther: summaryDataClass.baselineAdjustmentForOther,
                baselineAdjustment: summaryDataClass.baselineAdjustment,
                SEnPI: checkAnalysisValue(summaryDataClass.SEnPI),
                savings: checkAnalysisValue(summaryDataClass.savings),
                totalSavingsPercentImprovement: checkAnalysisValue(summaryDataClass.totalSavingsPercentImprovement) * 100,
                annualSavingsPercentImprovement: checkAnalysisValue(summaryDataClass.annualSavingsPercentImprovement) * 100,
                cummulativeSavings: checkAnalysisValue(summaryDataClass.cummulativeSavings),
                newSavings: checkAnalysisValue(summaryDataClass.newSavings),
                predictorUsage: summaryDataClass.predictorUsage
            }
        })
    }
}