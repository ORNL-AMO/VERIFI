/// <reference lib="webworker" />

import { FacilityOverviewData } from "../calculations/dashboard-calculations/facilityOverviewClass";
import { UtilityUseAndCost } from "../calculations/dashboard-calculations/useAndCostClass";


addEventListener('message', ({ data }) => {
    try {
        let facilityOverviewData: FacilityOverviewData = new FacilityOverviewData(data.calanderizedMeters, data.dateRange, data.facility);
        let utilityUseAndCost: UtilityUseAndCost = new UtilityUseAndCost(data.calanderizedMeters, data.dateRange);
        let results = {
            facilityOverviewData: facilityOverviewData,
            utilityUseAndCost: utilityUseAndCost,
            type: data.type,
            error: false
        }
        postMessage(results);
    } catch (err) {
        let results = {
            facilityOverviewData: undefined,
            utilityUseAndCost: undefined,
            type: data.type,
            error: true
        }
        postMessage(results);
    }
});
