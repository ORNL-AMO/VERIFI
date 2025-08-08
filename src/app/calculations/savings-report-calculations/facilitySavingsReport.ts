import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbFacilityReport, SavingsFacilityReportSettings } from "src/app/models/idbModels/facilityReport";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { AnnualFacilityAnalysisSummaryClass } from "../analysis-calculations/annualFacilityAnalysisSummaryClass";
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";

export class FacilitySavingsReport {

    annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    groupSummaries: Array<{
        group: AnalysisGroup,
        monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
        annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
    }>;

    constructor(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, accountPredictors: Array<IdbPredictor>,
        report: IdbFacilityReport
    ) {
        analysisItem.reportYear = report.savingsReportSettings.endYear;
        let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(analysisItem, facility, calanderizedMeters, accountPredictorEntries, false, accountPredictors, undefined, true);
        this.annualAnalysisSummaries = this.getAnnualAnalysisSummaries(annualAnalysisSummaryClass.getAnnualAnalysisSummaries(), report.savingsReportSettings);
        this.monthlyAnalysisSummaryData = this.getMonthlyAnalysisSummaryData(annualAnalysisSummaryClass.monthlyAnalysisSummaryData, report.savingsReportSettings);
        this.groupSummaries = annualAnalysisSummaryClass.groupSummaries.map((groupSummary: { group: AnalysisGroup, monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>, annualAnalysisSummaryData: Array<AnnualAnalysisSummary> }) => {
            return {
                group: groupSummary.group,
                monthlyAnalysisSummaryData: this.getMonthlyAnalysisSummaryData(groupSummary.monthlyAnalysisSummaryData, report.savingsReportSettings),
                annualAnalysisSummaryData: this.getAnnualAnalysisSummaries(groupSummary.annualAnalysisSummaryData, report.savingsReportSettings)
            }
        });
    }

    getAnnualAnalysisSummaries(annualAnalysisSummaryData: Array<AnnualAnalysisSummary>, savingsReportSettings: SavingsFacilityReportSettings): Array<AnnualAnalysisSummary> {
        if (savingsReportSettings.endMonth != 11) {
            //savings report ends mid-year, remove partial year summary
            return annualAnalysisSummaryData.filter((summary: AnnualAnalysisSummary) => {
                return summary.year != savingsReportSettings.endYear;
            });
        } else {
            //savings report ends at year-end, keep all summaries
            return annualAnalysisSummaryData;
        }
    }

    getMonthlyAnalysisSummaryData(monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>, savingsReportSettings: SavingsFacilityReportSettings): Array<MonthlyAnalysisSummaryData> {
        if (savingsReportSettings.endMonth != 11) {
            //savings report ends mid-year, remove monthly data past end month
            return monthlyAnalysisSummaryData.filter((summary: MonthlyAnalysisSummaryData) => {
                let date: Date = new Date(summary.date);
                if (date.getFullYear() < savingsReportSettings.endYear) {
                    return true;
                } else if (date.getFullYear() == savingsReportSettings.endYear) {
                    return date.getMonth() <= savingsReportSettings.endMonth;
                }
                return false;
            });
        } else {
            //savings report ends at year-end, keep all summaries
            return monthlyAnalysisSummaryData;
        }
    }
}