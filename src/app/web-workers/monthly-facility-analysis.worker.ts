/// <reference lib="webworker" />

import { MonthlyAnalysisSummary } from "../models/analysis";
import { MonthlyFacilityAnalysis } from "./classes/monthlyFacilityAnalysis";

addEventListener('message', ({ data }) => {
  console.log('called')
  let monthlyFacilityAnalysis: MonthlyFacilityAnalysis = new MonthlyFacilityAnalysis()
  let monthlyAnalysisSummary: MonthlyAnalysisSummary = monthlyFacilityAnalysis.getMonthlyAnalysisSummary(data.selectedGroup, data.analysisItem, data.facility, data.calanderizedMeters, data.accountPredictorEntries);
  console.log('calculation completed');
  // const response = `worker response to ${data}`;
  postMessage(monthlyAnalysisSummary);
});
