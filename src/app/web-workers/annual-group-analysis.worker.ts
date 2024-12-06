/// <reference lib="webworker" />

import { AnnualAnalysisSummary } from "src/app/models/analysis";
import { AnnualGroupAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualGroupAnalysisSummaryClass";
import { CalanderizedMeter } from "../models/calanderization";
import { getCalanderizedMeterData } from "../calculations/calanderization/calanderizeMeters";
import { getNeededUnits } from "../calculations/shared-calculations/calanderizationFunctions";

addEventListener('message', ({ data }) => {
    try {
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(data.meters, data.meterData, data.facility, false, { energyIsSource: data.analysisItem.energyIsSource, neededUnits: getNeededUnits(data.analysisItem) }, [], [], [data.facility]);
        let annualAnalysisSummaryClass: AnnualGroupAnalysisSummaryClass = new AnnualGroupAnalysisSummaryClass(data.selectedGroup, data.analysisItem, data.facility, calanderizedMeters, data.accountPredictorEntries, undefined, data.accountPredictors, data.accountAnalysisItems);
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
