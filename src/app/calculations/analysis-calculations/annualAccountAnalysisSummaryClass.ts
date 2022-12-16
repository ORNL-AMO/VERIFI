import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { AnnualAnalysisSummaryDataClass } from "./annualAnalysisSummaryDataClass";
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { MonthlyAccountAnalysisClass } from "./monthlyAccountAnalysisClass";
import { checkAnalysisValue } from "../shared-calculations/calculationsHelpers";

export class AnnualAccountAnalysisSummaryClass {

    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    annualAnalysisSummaryDataClasses: Array<AnnualAnalysisSummaryDataClass>;
    baselineYear: number;
    reportYear: number;
    constructor(
        accountAnalysisItem: IdbAccountAnalysisItem,
        account: IdbAccount,
        calanderizedMeters: Array<CalanderizedMeter>,
        accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorEntry>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>,
        calculateAllMonthlyData: boolean) {
        this.setMonthlyAnalysisSummaryData(accountAnalysisItem, account, calanderizedMeters, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, calculateAllMonthlyData);
        this.setBaselineYear(account);
        this.setReportYear(accountAnalysisItem);
        this.setAnnualAnalysisSummaryDataClasses(accountPredictorEntries);
    }

    setMonthlyAnalysisSummaryData(analysisItem: IdbAccountAnalysisItem, account: IdbAccount, calanderizedMeters: Array<CalanderizedMeter>, accountFacilities: Array<IdbFacility>, accountPredictorEntries: Array<IdbPredictorEntry>, allAccountAnalysisItems: Array<IdbAnalysisItem>, calculateAllMonthlyData: boolean) {
        let monthlyAnalysisSummaryClass: MonthlyAccountAnalysisClass = new MonthlyAccountAnalysisClass(analysisItem, account, calanderizedMeters, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, calculateAllMonthlyData);
        this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getMonthlyAnalysisSummaryData();
    }

    setBaselineYear(account: IdbAccount) {
        this.baselineYear = account.sustainabilityQuestions.energyReductionBaselineYear;
    }

    setReportYear(analysisItem: IdbAccountAnalysisItem) {
        this.reportYear = analysisItem.reportYear;
    }


    setAnnualAnalysisSummaryDataClasses(accountPredictorEntries: Array<IdbPredictorEntry>) {
        this.annualAnalysisSummaryDataClasses = new Array();
        let analysisYear: number = this.baselineYear;
        while (analysisYear <= this.reportYear) {
            let yearAnalysisSummaryDataClass: AnnualAnalysisSummaryDataClass = new AnnualAnalysisSummaryDataClass(this.monthlyAnalysisSummaryData, analysisYear, accountPredictorEntries, undefined, this.annualAnalysisSummaryDataClasses);
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