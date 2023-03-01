/// <reference lib="webworker" />

import { FacilitySummaryClass } from "src/app/calculations/dashboard-calculations/facilitySummaryClass";
import { FacilityOverviewData } from "../calculations/dashboard-calculations/facilityOverviewClass";
import { UtilityUseAndCost } from "../calculations/dashboard-calculations/useAndCostClass";


addEventListener('message', ({ data }) => {
    // let facilitySummaryClass: FacilitySummaryClass = new FacilitySummaryClass(data.calanderizedMeters, data.groups, data.sources, data.facility);
    // let results = {
    //     meterSummaryData: facilitySummaryClass.meterSummaryData,
    //     monthlySourceData: facilitySummaryClass.monthlySourceData,
    //     utilityUsageSummaryData: facilitySummaryClass.utilityUsageSummaryData,
    //     yearMonthData: facilitySummaryClass.yearMonthData,
    //     type: data.type
    // }

    let facilityOverviewData: FacilityOverviewData = new FacilityOverviewData(data.calanderizedMeters, data.dateRange, data.facility);
    let utilityUseAndCost: UtilityUseAndCost = new UtilityUseAndCost(data.calanderizedMeters, data.dateRange);
    let results = {
        facilityOverviewData: facilityOverviewData,
        utilityUseAndCost: utilityUseAndCost,
        type: data.type
    }


    postMessage(results);
});
