/// <reference lib="webworker" />

import { BetterPlantsSummary } from "../models/overview-report";
import { BetterPlantsReportClass } from "../calculations/better-plants-calculations/betterPlantsReportClass";

addEventListener('message', ({ data }) => {
    try {
        let betterPlantsSummaries: Array<BetterPlantsSummary> = new Array();
        let reportYear: number = data.reportYear;
        while (reportYear > data.baselineYear) {
            let betterPlantsReportClass: BetterPlantsReportClass = new BetterPlantsReportClass(
                data.baselineYear,
                reportYear,
                data.selectedAnalysisItem,
                data.accountPredictorEntries,
                data.account,
                data.facilities,
                data.accountAnalysisItems,
                data.meters,
                data.meterData,
                data.accountPredictors
            );
            let betterPlantsSummary: BetterPlantsSummary = betterPlantsReportClass.getBetterPlantsSummary();
            betterPlantsSummaries.push(betterPlantsSummary);
            if (data.includeAllYears) {
                reportYear--;
            } else {
                reportYear = data.baselineYear;
            }
        }
        postMessage({
            betterPlantsSummaries: betterPlantsSummaries,
            error: false
        });
    } catch (err) {
        console.log(err);
        postMessage({
            betterPlantsSummaries: undefined,
            error: true
        });
    }
});
