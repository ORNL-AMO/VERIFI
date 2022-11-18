/// <reference lib="webworker" />

import { FacilitySummaryClass } from "./classes/dashboard/facilitySummaryClass";


addEventListener('message', ({ data }) => {
    let facilitySummaryClass: FacilitySummaryClass = new FacilitySummaryClass(data.calanderizedMeters, data.groups, data.sources, data.facility);
    let results = {
        meterSummaryData: facilitySummaryClass.meterSummaryData,
        monthlySourceData: facilitySummaryClass.monthlySourceData,
        utilityUsageSummaryData: facilitySummaryClass.utilityUsageSummaryData,
        yearMonthData: facilitySummaryClass.yearMonthData,
        type: data.type
    }
    postMessage(results);
});
