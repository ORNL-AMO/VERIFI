/// <reference lib="webworker" />

import { AnnualAnalysisSummary } from "src/app/models/analysis";
import { AnnualGroupAnalysisSummaryClass } from "src/app/calculations/analysis-calculations/annualGroupAnalysisSummaryClass";

addEventListener('message', ({ data }) => {
    try {
        let annualAnalysisSummaryClass: AnnualGroupAnalysisSummaryClass = new AnnualGroupAnalysisSummaryClass(data.selectedGroup, data.analysisItem, data.facility, data.calanderizedMeters, data.accountPredictorEntries);
        let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
        postMessage({
            error: true,
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
