/// <reference lib="webworker" />

import { BetterClimateReport } from "../calculations/carbon-calculations/betterClimateReport";


addEventListener('message', ({ data }) => {
    try {
        let betterClimateReport: BetterClimateReport = new BetterClimateReport(data.account, data.facilities, data.meters, data.meterData, data.baselineYear, data.reportYear);
        postMessage({
            error: false,
            betterClimateReport: betterClimateReport
        });
    } catch (err) {
        console.log(err);
        postMessage({
            error: true,
            carbonReport: undefined
        });
    }
});
