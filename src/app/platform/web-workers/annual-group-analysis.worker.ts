/// <reference lib="webworker" />

import { AnnualAnalysisSummary } from "@data/models/analysis";
import { AnnualGroupAnalysisSummaryClass } from "@domain/calculations/analysis-calculations/annualGroupAnalysisSummaryClass";
import { CalanderizedMeter } from "@data/models/calanderization";
import { getCalanderizedMeterData } from "@domain/calculations/calanderization/calanderizeMeters";
import { getNeededUnits } from "@domain/calculations/shared-calculations/calanderizationFunctions";

addEventListener('message', ({ data }) => {
    try {
        let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(data.meters, data.meterData, data.facility, false, { energyIsSource: data.analysisItem.energyIsSource, neededUnits: getNeededUnits(data.analysisItem) }, [], [], [data.facility], data.assessmentReportVersion, []);
        let annualAnalysisSummaryClass: AnnualGroupAnalysisSummaryClass = new AnnualGroupAnalysisSummaryClass(
            data.selectedGroup,
            data.analysisItem,
            data.facility,
            calanderizedMeters,
            data.accountPredictorEntries,
            undefined,
            data.accountPredictors,
            data.accountAnalysisItems,
            { reportYear: data.reportYear }
        );
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
