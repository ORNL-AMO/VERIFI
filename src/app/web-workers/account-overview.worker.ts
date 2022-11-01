/// <reference lib="webworker" />

import { AccountSummaryClass } from "./classes/dashboard/accountSummaryClass";

addEventListener('message', ({ data }) => {
    let accountFacilitiesSummaryClass: AccountSummaryClass = new AccountSummaryClass(data.calanderizedMeters, data.facilities, data.sources);
    let results = {
        accountFacilitiesSummary: accountFacilitiesSummaryClass.facilitiesSummary,
        utilityUsageSummaryData: accountFacilitiesSummaryClass.utilityUsageSummaryData,
        type: data.type
    }
    postMessage(results);
});
