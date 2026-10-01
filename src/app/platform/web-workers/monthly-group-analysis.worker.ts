/// <reference lib="webworker" />

import { getCalanderizedMeterData } from "@domain/calculations/calanderization/calanderizeMeters";
import { MonthlyAnalysisSummary } from "@data/models/analysis";
import { MonthlyAnalysisSummaryClass } from "@domain/calculations/analysis-calculations/monthlyAnalysisSummaryClass";
import { CalanderizationOptions, CalanderizedMeter } from "@data/models/calanderization";
import { getNeededUnits } from "@domain/calculations/shared-calculations/calanderizationFunctions";

addEventListener('message', ({ data }) => {
  try {
    let calanderizationOptions: CalanderizationOptions = { energyIsSource: data.analysisItem.energyIsSource, neededUnits: getNeededUnits(data.analysisItem) };
    let calanderizedMeterData: Array<CalanderizedMeter> = getCalanderizedMeterData(data.meters, data.meterData, data.facility, false, calanderizationOptions, [], [], [data.facility], data.assessmentReportVersion, []);
    let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(
      data.selectedGroup,
      data.analysisItem,
      data.facility,
      calanderizedMeterData,
      data.accountPredictorEntries,
      false,
      data.accountAnalysisItems,
      { reportYear: data.reportYear }
    );
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
