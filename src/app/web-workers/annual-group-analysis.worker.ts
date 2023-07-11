/// <reference lib="webworker" />

import { AnnualAnalysisSummary } from "src/app/models/analysis";
import { AnnualGroupAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualGroupAnalysisSummaryClass";
import { CalanderizeMetersClass } from "../calculations/calanderization/calanderizeMeters";
import { CalanderizedMeter } from "../models/calanderization";

addEventListener('message', ({ data }) => {
    try {
        let calanderizedMeters: Array<CalanderizedMeter> = new CalanderizeMetersClass(data.meters, data.meterData, data.facility, false, { energyIsSource: data.analysisItem.energyIsSource }).calanderizedMeterData;
        let annualAnalysisSummaryClass: AnnualGroupAnalysisSummaryClass = new AnnualGroupAnalysisSummaryClass(data.selectedGroup, data.analysisItem, data.facility, calanderizedMeters, data.accountPredictorEntries);
        let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
        postMessage({
            error: false,
            annualAnalysisSummaries: annualAnalysisSummaries
        });
    } catch (err) {
        console.log(err);
        postMessage({
            error: true,
            annualAnalysisSummaries: undefined
        })
    }
});
