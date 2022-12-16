/// <reference lib="webworker" />

import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "../models/analysis";
import { AnnualAccountAnalysisSummaryClass } from "../calculations/analysis-calculations/annualAccountAnalysisSummaryClass";

addEventListener('message', ({ data }) => {
    let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(data.accountAnalysisItem, data.account, data.calanderizedMeters, data.accountFacilities, data.accountPredictorEntries, data.allAccountAnalysisItems, data.calculateAllMonthlyData);
    let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
    let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
    postMessage({
        annualAnalysisSummaries: annualAnalysisSummaries,
        monthlyAnalysisSummaryData: monthlyAnalysisSummaryData
    });
});
