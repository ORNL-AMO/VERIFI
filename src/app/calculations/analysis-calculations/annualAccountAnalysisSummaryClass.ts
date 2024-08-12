import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { AnnualAnalysisSummaryDataClass } from "./annualAnalysisSummaryDataClass";
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { MonthlyAccountAnalysisClass } from "./monthlyAccountAnalysisClass";
import { checkAnalysisValue } from "../shared-calculations/calculationsHelpers";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbPredictor } from "src/app/models/idbModels/predictor";

export class AnnualAccountAnalysisSummaryClass {

    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    annualAnalysisSummaryDataClasses: Array<AnnualAnalysisSummaryDataClass>;
    facilitySummaries: Array<{ facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }>
    baselineYear: number;
    reportYear: number;
    constructor(
        accountAnalysisItem: IdbAccountAnalysisItem,
        account: IdbAccount,
        accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorData>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>,
        calculateAllMonthlyData: boolean,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>,
        accountPredictors: Array<IdbPredictor>) {
        this.setMonthlyAnalysisSummaryData(accountAnalysisItem, account, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, calculateAllMonthlyData, meters, meterData, accountPredictors);
        this.setBaselineYear(accountAnalysisItem);
        this.setReportYear(accountAnalysisItem);
        this.setAnnualAnalysisSummaryDataClasses(accountPredictorEntries, accountPredictors);
    }

    setMonthlyAnalysisSummaryData(analysisItem: IdbAccountAnalysisItem, account: IdbAccount, accountFacilities: Array<IdbFacility>,
        accountPredictorEntries: Array<IdbPredictorData>, allAccountAnalysisItems: Array<IdbAnalysisItem>, calculateAllMonthlyData: boolean,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>, accountPredictors: Array<IdbPredictor>) {
        let monthlyAnalysisSummaryClass: MonthlyAccountAnalysisClass = new MonthlyAccountAnalysisClass(analysisItem, account, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, calculateAllMonthlyData, meters, meterData, accountPredictors);
        this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getMonthlyAnalysisSummaryData();
        this.facilitySummaries = monthlyAnalysisSummaryClass.facilitySummaries;
    }

    setBaselineYear(analysisItem: IdbAccountAnalysisItem) {
        this.baselineYear = analysisItem.baselineYear;
    }

    setReportYear(analysisItem: IdbAccountAnalysisItem) {
        this.reportYear = analysisItem.reportYear;
    }


    setAnnualAnalysisSummaryDataClasses(accountPredictorEntries: Array<IdbPredictorData>, accountPredictors: Array<IdbPredictor>) {
        this.annualAnalysisSummaryDataClasses = new Array();
        let analysisYear: number = this.baselineYear;
        while (analysisYear <= this.reportYear) {
            let yearAnalysisSummaryDataClass: AnnualAnalysisSummaryDataClass = new AnnualAnalysisSummaryDataClass(this.monthlyAnalysisSummaryData, analysisYear, accountPredictorEntries, undefined, this.annualAnalysisSummaryDataClasses, accountPredictors);
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
                predictorUsage: summaryDataClass.predictorUsage
            }
        })
    }
}