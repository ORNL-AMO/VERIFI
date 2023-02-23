/// <reference lib="webworker" />

import { AccountOverviewData } from "../calculations/dashboard-calculations/accountOverviewClass";
import { AccountSummaryClass } from "../calculations/dashboard-calculations/accountSummaryClass";

addEventListener('message', ({ data }) => {
    if (data.type != 'overview') {
        let accountFacilitiesSummaryClass: AccountSummaryClass = new AccountSummaryClass(data.calanderizedMeters, data.facilities, data.sources, data.account);
        let results = {
            accountFacilitiesSummary: accountFacilitiesSummaryClass.facilitiesSummary,
            utilityUsageSummaryData: accountFacilitiesSummaryClass.utilityUsageSummaryData,
            yearMonthData: accountFacilitiesSummaryClass.yearMonthData,
            type: data.type
        }
        postMessage(results);
    } else {
        let accountOverviewData: AccountOverviewData = new AccountOverviewData(data.calanderizedMeters, data.facilities, data.account, data.dateRange);
        let results = {
            accountOverviewData: accountOverviewData,
            type: data.type
        }
        postMessage(results);
    }
});
