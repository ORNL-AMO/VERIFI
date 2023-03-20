/// <reference lib="webworker" />

import { MonthlyAnalysisSummary } from "../models/analysis";
import { MonthlyAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/monthlyAnalysisSummaryClass";

addEventListener('message', ({ data }) => {
  try{
    let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(data.selectedGroup, data.analysisItem, data.facility, data.calanderizedMeters, data.accountPredictorEntries, false);
    let monthlyAnalysisSummary: MonthlyAnalysisSummary = monthlyAnalysisSummaryClass.getResults();
    postMessage({
      monthlyAnalysisSummary: monthlyAnalysisSummary,
      error: false
    });
  }catch(err){
    postMessage({
      monthlyAnalysisSummary: undefined,
      error: true
    });
  }
});
