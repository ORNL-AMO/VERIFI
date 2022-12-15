/// <reference lib="webworker" />

import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { AnnualFacilityAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass";

addEventListener('message', ({ data }) => {
    let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(data.analysisItem, data.facility, data.calanderizedMeters, data.accountPredictorEntries, data.calculateAllMonthlyData);
    let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
    let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
    postMessage({
        annualAnalysisSummaries: annualAnalysisSummaries,
        monthlyAnalysisSummaryData: monthlyAnalysisSummaryData,
        itemId: data.analysisItem.guid
    });
});
