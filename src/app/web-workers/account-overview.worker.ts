/// <reference lib="webworker" />

import { AccountOverviewData } from "../calculations/dashboard-calculations/accountOverviewClass";
import { UtilityUseAndCost } from "../calculations/dashboard-calculations/useAndCostClass";

addEventListener('message', ({ data }) => {
    try {
        let accountOverviewData: AccountOverviewData = new AccountOverviewData(data.calanderizedMeters, data.facilities, data.account, data.dateRange);
        let utilityUseAndCost: UtilityUseAndCost = new UtilityUseAndCost(data.calanderizedMeters, data.dateRange);
        let results = {
            accountOverviewData: accountOverviewData,
            utilityUseAndCost: utilityUseAndCost,
            type: data.type,
            error: false
        }
        postMessage(results);
    } catch (err) {
        let results = {
            accountOverviewData: undefined,
            utilityUseAndCost: undefined,
            type: data.type,
            error: true
        }
        postMessage(results);
    }
});
