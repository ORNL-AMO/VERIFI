/// <reference lib="webworker" />

import { getCalanderizedMeterData } from "../calculations/calanderization/calanderizeMeters";
import { MonthlyAnalysisSummary } from "../models/analysis";
import { MonthlyAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/monthlyAnalysisSummaryClass";
import { CalanderizationOptions, CalanderizedMeter } from "../models/calanderization";

addEventListener('message', ({ data }) => {
  try {
    let neededUnits: string = data.analysisItem.energyUnit;
    if (data.analysisItem.analysisCategory == 'water') {
      neededUnits = data.analysisItem.waterUnit;
    }
    let calanderizationOptions: CalanderizationOptions = { energyIsSource: data.analysisItem.energyIsSource, neededUnits: neededUnits };
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
