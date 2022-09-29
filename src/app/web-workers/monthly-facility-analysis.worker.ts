/// <reference lib="webworker" />

import { MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from "../models/analysis";
import { MonthlyAnalysisSummaryClass } from "./classes/monthlyAnalysisSummaryClass";

addEventListener('message', ({ data }) => {
  let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(data.selectedGroup, data.analysisItem, data.facility, data.calanderizedMeters, data.accountPredictorEntries);
  let monthlyAnalysisSummary: MonthlyAnalysisSummary = monthlyAnalysisSummaryClass.getResults();
  postMessage(monthlyAnalysisSummary);
});
