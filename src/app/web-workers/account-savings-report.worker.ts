import { AccountSavingsReport } from "../calculations/savings-report-calculations/accountSavingsReport";

addEventListener('message', ({ data }) => {
    try {
        let accountSavingsReport: AccountSavingsReport = new AccountSavingsReport(
                data.report,
                data.selectedAnalysisItem,
                data.accountPredictorEntries,
                data.account,
                data.facilities,
                data.accountAnalysisItems,
                data.meters,
                data.meterData,
                data.accountPredictors);
        postMessage({
            error: false,
            accountSavingsReport: accountSavingsReport
        });
    } catch (err) {
        console.log(err);
        postMessage({
            error: true,
            accountSavingsReport: undefined
        });
    }
});