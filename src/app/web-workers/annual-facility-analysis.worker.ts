/// <reference lib="webworker" />

import { AnnualAnalysisSummary } from "src/app/models/analysis";
import { AnnualAnalysisSummaryClass } from "./classes/annualAnalysisSummaryClass";

addEventListener('message', ({ data }) => {
    let annualAnalysisSummaryClass: AnnualAnalysisSummaryClass = new AnnualAnalysisSummaryClass(data.selectedGroup, data.analysisItem, data.facility, data.calanderizedMeters, data.accountPredictorEntries);
    let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
    postMessage(annualAnalysisSummaries);
});
