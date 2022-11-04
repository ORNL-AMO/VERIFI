/// <reference lib="webworker" />

import { MonthlyAnalysisSummaryData } from "../models/analysis";
import { MonthlyAccountAnalysisClass } from "./classes/monthlyAccountAnalysisClass";

addEventListener('message', ({ data }) => {
    let monthlyAnalysisSummaryClass: MonthlyAccountAnalysisClass = new MonthlyAccountAnalysisClass(data.accountAnalysisItem, data.account, data.calanderizedMeters, data.accountFacilities, data.accountPredictorEntries, data.allAccountAnalysisItems);
    let monthlyAnalysisSummary: Array<MonthlyAnalysisSummaryData> = monthlyAnalysisSummaryClass.getMonthlyAnalysisSummaryData();
    postMessage(monthlyAnalysisSummary);
});
