/// <reference lib="webworker" />

import { CalanderizeMetersClass } from "../calculations/calanderization/calanderizeMeters";
import { MonthlyAnalysisSummary } from "../models/analysis";
import { MonthlyAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/monthlyAnalysisSummaryClass";

addEventListener('message', ({ data }) => {
  try {
    let calanderizationOptions = { energyIsSource: data.analysisItem.energyIsSource };
    let calanderizeMeters: CalanderizeMetersClass = new CalanderizeMetersClass(data.meters, data.meterData, data.facility, false, calanderizationOptions);
    let calanderizedMeters = calanderizeMeters.calanderizedMeterData;
    let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(data.selectedGroup, data.analysisItem, data.facility, calanderizedMeters, data.accountPredictorEntries, false);
    let monthlyAnalysisSummary: MonthlyAnalysisSummary = monthlyAnalysisSummaryClass.getResults();
    postMessage({
      monthlyAnalysisSummary: monthlyAnalysisSummary,
      error: false
    });
  } catch (err) {
    postMessage({
      monthlyAnalysisSummary: undefined,
      error: true
    });
  }
});
