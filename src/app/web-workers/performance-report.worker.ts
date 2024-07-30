/// <reference lib="webworker" />

import { PerformanceReport } from "../calculations/performance-report-calculations/performanceReport";

addEventListener('message', ({ data }) => {
    try {
        let performanceReport: PerformanceReport = new PerformanceReport(
            data.baselineYear,
            data.reportYear,
            data.selectedAnalysisItem,
            data.accountPredictorEntries,
            data.account,
            data.facilities,
            data.accountAnalysisItems,
            data.meters,
            data.meterData,
            data.predictors);
        postMessage({
            error: false,
            performanceReport: performanceReport
        });
    } catch (err) {
        console.log(err);
        postMessage({
            error: true,
            performanceReport: undefined
        });
    }
});
