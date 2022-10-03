/// <reference lib="webworker" />

import { AnnualAnalysisSummary } from "../models/analysis";
import { AnnualAccountAnalysisSummaryClass } from "./classes/annualAccountAnalysisSummaryClass";

addEventListener('message', ({ data }) => {
    let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(data.accountAnalysisItem, data.account, data.calanderizedMeters, data.accountFacilities, data.accountPredictorEntries, data.allAccountAnalysisItems);
    let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
    postMessage(annualAnalysisSummaries);
});
