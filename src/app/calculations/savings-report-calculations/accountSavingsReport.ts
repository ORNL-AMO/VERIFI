import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { PerformanceReport } from "../performance-report-calculations/performanceReport";
import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbAccount } from "src/app/models/idbModels/account";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { AnnualAccountAnalysisSummaryClass } from "../analysis-calculations/annualAccountAnalysisSummaryClass";
import { IdbAccountReport } from "src/app/models/idbModels/accountReport";
import { getSavingsReportAnnualAnalysisSummaries, getSavingsReportMonthlyAnalysisSummaryData } from "./sharedSavingsReport";
import { AnnualAnalysisSummaryDataClass } from "../analysis-calculations/annualAnalysisSummaryDataClass";


export class AccountSavingsReport {

    performanceReport: PerformanceReport;
    annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    facilitySummaries: Array<{
        facility: IdbFacility,
        analysisItem: IdbAnalysisItem,
        monthlySummaryData: Array<MonthlyAnalysisSummaryData>,
        annualAnalysisSummaries: Array<AnnualAnalysisSummary>
    }>

    constructor(
        report: IdbAccountReport,
        selectedAnalysisItem: IdbAccountAnalysisItem,
        accountPredictorEntries: Array<IdbPredictorData>,
        account: IdbAccount,
        facilities: Array<IdbFacility>,
        accountAnalysisItems: Array<IdbAnalysisItem>,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>,
        accountPredictors: Array<IdbPredictor>) {

        selectedAnalysisItem.reportYear = report.endYear;
        accountAnalysisItems.forEach(item => {
            item.reportYear = report.endYear;
        });
        this.performanceReport = new PerformanceReport(
            selectedAnalysisItem.baselineYear,
            report.endYear,
            selectedAnalysisItem,
            accountPredictorEntries,
            account,
            facilities,
            accountAnalysisItems,
            meters,
            meterData,
            accountPredictors
        );
        let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(selectedAnalysisItem, account, facilities, accountPredictorEntries, accountAnalysisItems, false, meters, meterData, accountPredictors);
        this.annualAnalysisSummaries = getSavingsReportAnnualAnalysisSummaries(annualAnalysisSummaryClass.getAnnualAnalysisSummaries(), report.endMonth, report.endYear);
        this.monthlyAnalysisSummaryData = getSavingsReportMonthlyAnalysisSummaryData(annualAnalysisSummaryClass.monthlyAnalysisSummaryData, report.endMonth, report.endYear);
        this.setFacilitySummaries(annualAnalysisSummaryClass, report, accountPredictorEntries, accountPredictors);
    }

    setFacilitySummaries(annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass, report: IdbAccountReport, accountPredictorEntries: Array<IdbPredictorData>, accountPredictors: Array<IdbPredictor>) {
        this.facilitySummaries = new Array();
        annualAnalysisSummaryClass.facilitySummaries.forEach(facilitySummary => {
            let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = new Array();
            let previousYearsSummaryData: Array<AnnualAnalysisSummaryDataClass> = new Array();
            for (let year = facilitySummary.analysisItem.baselineYear; year <= report.endYear; year++) {
                let annualSummaryData: AnnualAnalysisSummaryDataClass = new AnnualAnalysisSummaryDataClass(
                    facilitySummary.monthlySummaryData,
                    year,
                    accountPredictorEntries,
                    facilitySummary.facility,
                    previousYearsSummaryData,
                    accountPredictors
                );
                previousYearsSummaryData.push(annualSummaryData);
                annualAnalysisSummaries.push(annualSummaryData.getFormattedResult());
            }
            this.facilitySummaries.push({
                facility: facilitySummary.facility,
                analysisItem: facilitySummary.analysisItem,
                monthlySummaryData: getSavingsReportMonthlyAnalysisSummaryData(facilitySummary.monthlySummaryData, report.endMonth, report.endYear),
                annualAnalysisSummaries: getSavingsReportAnnualAnalysisSummaries(annualAnalysisSummaries, report.endMonth, report.endYear)
            });
        });
    }

}