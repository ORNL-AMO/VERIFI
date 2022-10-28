/// <reference lib="webworker" />

import { MeterSource } from "../models/idb";
import { AccountFacilitiesSummaryClass } from "./classes/dashboard/accountFacilitiesSummaryClass";

addEventListener('message', ({ data }) => {
    let accountFacilitiesSummaryClass: AccountFacilitiesSummaryClass = new AccountFacilitiesSummaryClass(data.calanderizedMeters, data.facilities, data.sources);
    let results = {
        accountFacilitiesSummary: accountFacilitiesSummaryClass.facilitiesSummary,
        utilityUsageSummaryData: accountFacilitiesSummaryClass.utilityUsageSummaryData,
        type: data.type
    }
    postMessage(results);
});
