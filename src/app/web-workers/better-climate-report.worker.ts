/// <reference lib="webworker" />

import { BetterClimateReport } from "../calculations/carbon-calculations/betterClimateReport";


addEventListener('message', ({ data }) => {
    try {
        let betterClimateReport: BetterClimateReport = new BetterClimateReport(data.account, data.facilities, data.meters, data.meterData, data.baselineYear, data.reportYear, data.co2Emissions, data.emissionsDisplay, data.emissionsGoal, data.customFuels, data.betterClimateReportSetup);
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
