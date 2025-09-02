import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbFacilityReport, SavingsFacilityReportSettings } from "src/app/models/idbModels/facilityReport";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { AnnualFacilityAnalysisSummaryClass } from "../analysis-calculations/annualFacilityAnalysisSummaryClass";
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { getLatestMonthSummary, getSavingsReportAnnualAnalysisSummaries, getSavingsReportMonthlyAnalysisSummaryData } from "./sharedSavingsReport";

export class FacilitySavingsReport {

    annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    groupSummaries: Array<{
        group: AnalysisGroup,
        monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
        annualAnalysisSummaryData: Array<AnnualAnalysisSummary>,
        latestMonthGroupSummary: MonthlyAnalysisSummaryData
    }>;
    latestMonthSummary: MonthlyAnalysisSummaryData;

    constructor(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, accountPredictors: Array<IdbPredictor>,
        report: IdbFacilityReport
    ) {
        analysisItem.reportYear = report.savingsReportSettings.endYear;
        let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(analysisItem, facility, calanderizedMeters, accountPredictorEntries, false, accountPredictors, undefined, true);
        this.annualAnalysisSummaries = getSavingsReportAnnualAnalysisSummaries(annualAnalysisSummaryClass.getAnnualAnalysisSummaries(), report.savingsReportSettings.endMonth, report.savingsReportSettings.endYear);
        this.monthlyAnalysisSummaryData = getSavingsReportMonthlyAnalysisSummaryData(annualAnalysisSummaryClass.monthlyAnalysisSummaryData, report.savingsReportSettings.endMonth, report.savingsReportSettings.endYear);
        this.groupSummaries = annualAnalysisSummaryClass.groupSummaries.map((groupSummary: { group: AnalysisGroup, monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>, annualAnalysisSummaryData: Array<AnnualAnalysisSummary> }) => {
            return {
                group: groupSummary.group,
                monthlyAnalysisSummaryData: getSavingsReportMonthlyAnalysisSummaryData(groupSummary.monthlyAnalysisSummaryData, report.savingsReportSettings.endMonth, report.savingsReportSettings.endYear),
                annualAnalysisSummaryData: getSavingsReportAnnualAnalysisSummaries(groupSummary.annualAnalysisSummaryData, report.savingsReportSettings.endMonth, report.savingsReportSettings.endYear),
                latestMonthGroupSummary: getLatestMonthSummary(getSavingsReportMonthlyAnalysisSummaryData(groupSummary.monthlyAnalysisSummaryData, report.savingsReportSettings.endMonth, report.savingsReportSettings.endYear))
            }
        });
        this.latestMonthSummary = getLatestMonthSummary(this.monthlyAnalysisSummaryData);
    }
}