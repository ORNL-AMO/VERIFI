/// <reference lib="webworker" />

import { MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { MonthlyAnalysis } from "src/app/web-workers/classes/monthlyAnalysis";

addEventListener('message', ({ data }) => {

  let monthlyAnalysis: MonthlyAnalysis = new MonthlyAnalysis(data.accountAnalysisItem, data.account, data.calanderizedMeters);
  let results: Array<MonthlyAnalysisSummaryData> = monthlyAnalysis.calculateMonthlyAnalysis();
  postMessage(results);
});
