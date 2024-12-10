/// <reference lib="webworker" />

import { getCalanderizedMeterData } from "../calculations/calanderization/calanderizeMeters";
import { SEPReport } from "../calculations/facility-reports/sepReport";
import { getNeededUnits } from "../calculations/shared-calculations/calanderizationFunctions";
import { CalanderizedMeter } from "../models/calanderization";


addEventListener('message', ({ data }) => {
    try {
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(data.meters, data.meterData, data.facility, false, { energyIsSource: data.analysisItem.energyIsSource, neededUnits: getNeededUnits(data.analysisItem) }, [], [], [data.facility]);
        let sepReport: SEPReport = new SEPReport(data.analysisItem, data.facility, calanderizedMeters, data.accountPredictorEntries, data.calculateAllMonthlyData, data.accountPredictors, data.accountAnalysisItems);
        postMessage({
            error: false,
            sepReport: sepReport
        });
    } catch (err) {
        console.log(err);
        postMessage({
            error: true,
            sepReport: undefined
        });
    }
});
