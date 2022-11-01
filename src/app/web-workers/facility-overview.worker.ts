/// <reference lib="webworker" />

import { FacilitySummaryClass } from "./classes/dashboard/facilitySummaryClass";


addEventListener('message', ({ data }) => {
    let accountFacilitiesSummaryClass: FacilitySummaryClass = new FacilitySummaryClass(data.calanderizedMeters, data.groups, data.sources);
    let results = {
        meterSummaryData: accountFacilitiesSummaryClass.meterSummaryData,
        // utilityUsageSummaryData: accountFacilitiesSummaryClass.utilityUsageSummaryData,
        type: data.type
    }
    postMessage(results);
});
