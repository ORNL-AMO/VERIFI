/// <reference lib="webworker" />

import { BetterPlantsSummary } from "../models/overview-report";
import { BetterPlantsReportClass } from "../calculations/better-plants-calculations/betterPlantsReportClass";

addEventListener('message', ({ data }) => {
    try {
        let betterPlantsReportClass: BetterPlantsReportClass = new BetterPlantsReportClass(
            data.baselineYear,
            data.reportYear,
            data.selectedAnalysisItem,
            data.accountPredictorEntries,
            data.account,
            data.facilities,
            data.accountAnalysisItems,
            data.meters,
            data.meterData
        );
        let betterPlantsSummary: BetterPlantsSummary = betterPlantsReportClass.getBetterPlantsSummary();
        postMessage({
            betterPlantsSummary: betterPlantsSummary,
            error: false
        });
    } catch (err) {
        console.log(err);
        postMessage({
            betterPlantsSummary: undefined,
            error: true
        });
    }
});
