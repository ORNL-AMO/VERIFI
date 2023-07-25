/// <reference lib="webworker" />

import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from "src/app/models/analysis";
import { AnnualFacilityAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass";
import { CalanderizedMeter } from "../models/calanderization";
import { getCalanderizedMeterData } from "../calculations/calanderization/calanderizeMeters";
import { getNeededUnits } from "../calculations/shared-calculations/calanderizationFunctions";

addEventListener('message', ({ data }) => {
    try {
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(data.meters, data.meterData, data.facility, false, { energyIsSource: data.analysisItem.energyIsSource, neededUnits: getNeededUnits(data.analysisItem) });
        let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(data.analysisItem, data.facility, calanderizedMeters, data.accountPredictorEntries, data.calculateAllMonthlyData);
        let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
        let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
        postMessage({
            annualAnalysisSummaries: annualAnalysisSummaries,
            monthlyAnalysisSummaryData: monthlyAnalysisSummaryData,
            itemId: data.analysisItem.guid,
            error: false
        });
    } catch (err) {
        console.log(err);
        postMessage({
            error: true,
            annualAnalysisSummaries: undefined,
            monthlyAnalysisSummaryData: undefined,
            itemId: data.analysisItem.guid
        });
    }
});
