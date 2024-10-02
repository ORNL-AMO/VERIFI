/// <reference lib="webworker" />

import { getCalanderizedMeterData } from "../calculations/calanderization/calanderizeMeters";
import { MonthlyAnalysisSummary } from "../models/analysis";
import { MonthlyAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/monthlyAnalysisSummaryClass";
import { CalanderizationOptions, CalanderizedMeter } from "../models/calanderization";
import { getNeededUnits } from "../calculations/shared-calculations/calanderizationFunctions";

addEventListener('message', ({ data }) => {
  try {
    let calanderizationOptions: CalanderizationOptions = { energyIsSource: data.analysisItem.energyIsSource, neededUnits: getNeededUnits(data.analysisItem) };
    let calanderizedMeterData: Array<CalanderizedMeter> = getCalanderizedMeterData(data.meters, data.meterData, data.facility, false, calanderizationOptions, [], [], [data.facility]);
    let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(data.selectedGroup, data.analysisItem, data.facility, calanderizedMeterData, data.accountPredictorEntries, false, data.accountAnalysisItems);
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
