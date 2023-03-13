/// <reference lib="webworker" />

import { BetterPlantsSummary } from "../models/overview-report";
import { BetterPlantsReportClass } from "../calculations/better-plants-calculations/betterPlantsReportClass";

addEventListener('message', ({ data }) => {
    let betterPlantsReportClass: BetterPlantsReportClass = new BetterPlantsReportClass(
        data.baselineYear,
        data.reportYear,
        data.selectedAnalysisItem,
        data.calanderizedMeters,
        data.accountPredictorEntries,
        data.account,
        data.facilities,
        data.accountAnalysisItems
    );
    let betterPlantsSummary: BetterPlantsSummary = betterPlantsReportClass.getBetterPlantsSummary();
    postMessage(betterPlantsSummary);
});
