/// <reference lib="webworker" />

import { MonthlyAnalysisSummaryData } from "../models/analysis";
import { MonthlyFacilityAnalysisClass } from "./classes/monthlyFacilityAnalysisClass";

addEventListener('message', ({ data }) => {
  let monthlyAnalysisSummaryClass: MonthlyFacilityAnalysisClass = new MonthlyFacilityAnalysisClass(data.analysisItem, data.facility, data.calanderizedMeters, data.accountPredictorEntries);
  let monthlyAnalysisSummary: Array<MonthlyAnalysisSummaryData> = monthlyAnalysisSummaryClass.getMonthlyAnalysisSummaryData();
  postMessage(monthlyAnalysisSummary);
});
