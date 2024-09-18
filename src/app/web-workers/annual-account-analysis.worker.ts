/// <reference lib="webworker" />

import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "../models/analysis";
import { AnnualAccountAnalysisSummaryClass } from "../calculations/analysis-calculations/annualAccountAnalysisSummaryClass";
import { MonthlyFacilityAnalysisClass } from "../calculations/analysis-calculations/monthlyFacilityAnalysisClass";

addEventListener('message', ({ data }) => {
    try {
        let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(data.accountAnalysisItem, data.account, data.accountFacilities, data.accountPredictorEntries, data.allAccountAnalysisItems, data.calculateAllMonthlyData, data.meters, data.meterData, data.accountPredictors);
        let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
        let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
        postMessage({
            annualAnalysisSummaries: annualAnalysisSummaries,
            monthlyAnalysisSummaryData: monthlyAnalysisSummaryData,
            error: false,
            facilitySummaries: annualAnalysisSummaryClass.facilitySummaries
        });
    } catch (err) {
        postMessage({
            annualAnalysisSummaries: undefined,
            monthlyAnalysisSummaryData: undefined,
            error: true,
            facilitySummaries: undefined
        });
    }
});
