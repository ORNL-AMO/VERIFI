/// <reference lib="webworker" />

import { AccountFacilitiesSummaryClass } from "./classes/dashboard/accountFacilitiesSummaryClass";

addEventListener('message', ({ data }) => {
    let accountFacilitiesSummaryClass: AccountFacilitiesSummaryClass = new AccountFacilitiesSummaryClass(data.calanderizedMeters, data.facilities);
    let results = {
        accountFacilitiesSummary: accountFacilitiesSummaryClass.facilitiesSummary,
        utilityUsageSummaryData: accountFacilitiesSummaryClass.utilityUsageSummaryData
    }
    postMessage(results);
});
