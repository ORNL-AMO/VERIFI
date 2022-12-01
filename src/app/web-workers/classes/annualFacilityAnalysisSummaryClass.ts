import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccount, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from "src/app/models/idb";
import { AnnualAnalysisSummaryDataClass } from "./annualAnalysisSummaryDataClass";
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { HelperService } from "./helperService";
import { MonthlyFacilityAnalysisClass } from "./monthlyFacilityAnalysisClass";

export class AnnualFacilityAnalysisSummaryClass {

    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    annualAnalysisSummaryDataClasses: Array<AnnualAnalysisSummaryDataClass>;
    baselineYear: number;
    reportYear: number;
    helperService: HelperService;
    constructor(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
        this.helperService = new HelperService();
        this.setMonthlyAnalysisSummaryData(analysisItem, facility, calanderizedMeters, accountPredictorEntries);
        this.setBaselineYear(facility);
        this.setReportYear(analysisItem, facility);
        this.setAnnualAnalysisSummaryDataClasses(accountPredictorEntries, facility);
    }

    setMonthlyAnalysisSummaryData(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
        let monthlyAnalysisSummaryClass: MonthlyFacilityAnalysisClass = new MonthlyFacilityAnalysisClass(analysisItem, facility, calanderizedMeters, accountPredictorEntries);
        this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryClass.getMonthlyAnalysisSummaryData();
    }

    setBaselineYear(facilityOrAccount: IdbFacility | IdbAccount) {
        this.baselineYear = facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear;
        // if (facilityOrAccount.fiscalYear == 'nonCalendarYear' && facilityOrAccount.fiscalYearCalendarEnd) {
        //     this.baselineYear = this.baselineYear - 1;
        // }
    }

    setReportYear(analysisItem: IdbAnalysisItem, facilityOrAccount: IdbFacility | IdbAccount) {
        this.reportYear = analysisItem.reportYear;
        // if (facilityOrAccount.fiscalYear == 'nonCalendarYear' && facilityOrAccount.fiscalYearCalendarEnd) {
        //     this.reportYear = this.reportYear - 1;
        // }
    }


    setAnnualAnalysisSummaryDataClasses(accountPredictorEntries: Array<IdbPredictorEntry>, facility: IdbFacility) {
        this.annualAnalysisSummaryDataClasses = new Array();
        let analysisYear: number = this.baselineYear;
        while (analysisYear <= this.reportYear) {
            // let annualAnalysisSummaryDataClassCopy: Array<AnnualAnalysisSummaryDataClass> = JSON.parse(JSON.stringify(this.annualAnalysisSummaryDataClasses))
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
                SEnPI: this.helperService.checkValue(summaryDataClass.SEnPI),
                savings: this.helperService.checkValue(summaryDataClass.savings),
                totalSavingsPercentImprovement: this.helperService.checkValue(summaryDataClass.totalSavingsPercentImprovement) * 100,
                annualSavingsPercentImprovement: this.helperService.checkValue(summaryDataClass.annualSavingsPercentImprovement) * 100,
                cummulativeSavings: this.helperService.checkValue(summaryDataClass.cummulativeSavings),
                newSavings: this.helperService.checkValue(summaryDataClass.newSavings),
                predictorUsage: summaryDataClass.predictorUsage
            }
        })
    }
}