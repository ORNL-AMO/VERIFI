import { CalanderizedMeter } from "@data/models/calanderization";
import { IdbAnalysisItem } from "@data/models/idbModels/analysisItem";
import { IdbFacility } from "@data/models/idbModels/facility";
import { IdbFacilityReport, SavingsFacilityReportSettings } from "@data/models/idbModels/facilityReport";
import { IdbPredictor } from "@data/models/idbModels/predictor";
import { IdbPredictorData } from "@data/models/idbModels/predictorData";
import { AnnualFacilityAnalysisSummaryClass } from "../analysis-calculations/annualFacilityAnalysisSummaryClass";
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "@data/models/analysis";
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
        let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(
            analysisItem,
            facility,
            calanderizedMeters,
            accountPredictorEntries,
            false,
            accountPredictors,
            undefined,
            true,
            { reportYear: report.savingsReportSettings.endYear }
        );
        this.annualAnalysisSummaries = getSavingsReportAnnualAnalysisSummaries(annualAnalysisSummaryClass.getAnnualAnalysisSummaries(), report.savingsReportSettings.endMonth, report.savingsReportSettings.endYear);
        this.monthlyAnalysisSummaryData = getSavingsReportMonthlyAnalysisSummaryData(annualAnalysisSummaryClass.monthlyAnalysisSummaryData, report.savingsReportSettings.endMonth, report.savingsReportSettings.endYear);
        this.groupSummaries = annualAnalysisSummaryClass.groupSummaries.map((groupSummary: { group: AnalysisGroup, monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>, annualAnalysisSummaryData: Array<AnnualAnalysisSummary> }) => {
            let monthlyData = getSavingsReportMonthlyAnalysisSummaryData(groupSummary.monthlyAnalysisSummaryData, report.savingsReportSettings.endMonth, report.savingsReportSettings.endYear);
            return {
                group: groupSummary.group,
                monthlyAnalysisSummaryData: monthlyData,
                annualAnalysisSummaryData: getSavingsReportAnnualAnalysisSummaries(groupSummary.annualAnalysisSummaryData, report.savingsReportSettings.endMonth, report.savingsReportSettings.endYear),
                latestMonthGroupSummary: getLatestMonthSummary(monthlyData)
            }
        });
        this.latestMonthSummary = getLatestMonthSummary(this.monthlyAnalysisSummaryData);
    }
}
