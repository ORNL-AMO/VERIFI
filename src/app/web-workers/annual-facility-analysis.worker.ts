/// <reference lib="webworker" />

import { AnnualAnalysisSummary } from "src/app/models/analysis";
import { AnnualFacilityAnalysisSummaryClass } from "./classes/annualFacilityAnalysisSummaryClass";

addEventListener('message', ({ data }) => {
    let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(data.analysisItem, data.facility, data.calanderizedMeters, data.accountPredictorEntries);
    let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
    postMessage(annualAnalysisSummaries);
});