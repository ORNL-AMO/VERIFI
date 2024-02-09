import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { AnnualAnalysisSummaryDataClass } from "./annualAnalysisSummaryDataClass";
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { MonthlyAccountAnalysisClass } from "./monthlyAccountAnalysisClass";
import { checkAnalysisValue } from "../shared-calculations/calculationsHelpers";

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
        accountPredictorEntries: Array<IdbPredictorEntry>,
        allAccountAnalysisItems: Array<IdbAnalysisItem>,
        calculateAllMonthlyData: boolean,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>) {
        this.setMonthlyAnalysisSummaryData(accountAnalysisItem, account, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, calculateAllMonthlyData, meters, meterData);
        this.setBaselineYear(accountAnalysisItem);
        this.setReportYear(accountAnalysisItem);
        this.setAnnualAnalysisSummaryDataClasses(accountPredictorEntries);
    }

    setMonthlyAnalysisSummaryData(analysisItem: IdbAccountAnalysisItem, account: IdbAccount, accountFacilities: Array<IdbFacility>, 
        accountPredictorEntries: Array<IdbPredictorEntry>, allAccountAnalysisItems: Array<IdbAnalysisItem>, calculateAllMonthlyData: boolean,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>) {
        let monthlyAnalysisSummaryClass: MonthlyAccountAnalysisClass = new MonthlyAccountAnalysisClass(analysisItem, account, accountFacilities, accountPredictorEntries, allAccountAnalysisItems, calculateAllMonthlyData, meters, meterData);
        this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getMonthlyAnalysisSummaryData();
        this.facilitySummaries = monthlyAnalysisSummaryClass.facilitySummaries;
    }

    setBaselineYear(analysisItem: IdbAccountAnalysisItem) {
        this.baselineYear = analysisItem.baselineYear;
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
                adjustementForNormalization: summaryDataClass.adjustementForNormalization,
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