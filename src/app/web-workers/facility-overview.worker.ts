/// <reference lib="webworker" />

import { FacilityOverviewData } from "../calculations/dashboard-calculations/facilityOverviewClass";
import { UtilityUseAndCost } from "../calculations/dashboard-calculations/useAndCostClass";


addEventListener('message', ({ data }) => {
    let facilityOverviewData: FacilityOverviewData = new FacilityOverviewData(data.calanderizedMeters, data.dateRange, data.facility);
    let utilityUseAndCost: UtilityUseAndCost = new UtilityUseAndCost(data.calanderizedMeters, data.dateRange);
    let results = {
        facilityOverviewData: facilityOverviewData,
        utilityUseAndCost: utilityUseAndCost,
        type: data.type
    }
    postMessage(results);
});
