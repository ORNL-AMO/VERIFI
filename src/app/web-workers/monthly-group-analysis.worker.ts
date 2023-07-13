/// <reference lib="webworker" />

import { getCalanderizedMeterData } from "../calculations/calanderization/calanderizeMeters";
import { MonthlyAnalysisSummary } from "../models/analysis";
import { MonthlyAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/monthlyAnalysisSummaryClass";
import { CalanderizedMeter } from "../models/calanderization";

addEventListener('message', ({ data }) => {
  try {
    let calanderizationOptions = { energyIsSource: data.analysisItem.energyIsSource };
    let calanderizedMeterData: Array<CalanderizedMeter> = getCalanderizedMeterData(data.meters, data.meterData, data.facility, false, calanderizationOptions);
    let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(data.selectedGroup, data.analysisItem, data.facility, calanderizedMeterData, data.accountPredictorEntries, false);
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
