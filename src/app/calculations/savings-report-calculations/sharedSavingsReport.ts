import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";

export function getSavingsReportAnnualAnalysisSummaries(annualAnalysisSummaryData: Array<AnnualAnalysisSummary>, endMonth: number, endYear: number): Array<AnnualAnalysisSummary> {
    if (endMonth != 11) {
        //savings report ends mid-year, remove partial year summary
        return annualAnalysisSummaryData.filter((summary: AnnualAnalysisSummary) => {
            return summary.year != endYear;
        });
    } else {
        //savings report ends at year-end, keep all summaries
        return annualAnalysisSummaryData;
    }
}

export function getSavingsReportMonthlyAnalysisSummaryData(monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>, endMonth: number, endYear: number): Array<MonthlyAnalysisSummaryData> {
    if (endMonth != 11) {
        //savings report ends mid-year, remove monthly data past end month
        return monthlyAnalysisSummaryData.filter((summary: MonthlyAnalysisSummaryData) => {
            let date: Date = new Date(summary.date);
            if (date.getFullYear() < endYear) {
                return true;
            } else if (date.getFullYear() == endYear) {
                return date.getMonth() <= endMonth;
            }
            return false;
        });
    } else {
        //savings report ends at year-end, keep all summaries
        return monthlyAnalysisSummaryData;
    }
}