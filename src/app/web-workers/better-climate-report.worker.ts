/// <reference lib="webworker" />

import { BetterClimateReport } from "../calculations/carbon-calculations/betterClimateReport";


addEventListener('message', ({ data }) => {
    try {
        let betterClimateReport: BetterClimateReport = new BetterClimateReport();
        console.log('hello')
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
