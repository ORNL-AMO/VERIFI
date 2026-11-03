/// <reference lib="webworker" />

import { BetterPlantsSummary } from "@data/models/overview-report";
import { BetterPlantsReportClass } from "@domain/calculations/better-plants-calculations/betterPlantsReportClass";
import { getBetterPlantsReportYears } from "@domain/calculations/better-plants-calculations/betterPlantsReportHelpers";

addEventListener('message', ({ data }) => {
    try {
        let betterPlantsSummaries: Array<BetterPlantsSummary> = new Array();
        const reportYears = getBetterPlantsReportYears(data.baselineYear, data.reportYear, data.includeAllYears);
        reportYears.forEach(reportYear => {
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
        });
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
