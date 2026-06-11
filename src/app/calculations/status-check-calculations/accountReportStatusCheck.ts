import { AccountReportErrors } from "src/app/models/validation";
import { STATUS_CHECK_OPTIONS } from "./statusCheckModels";
import { IdbAccountReport } from "src/app/models/idbModels/accountReport";
import { AccountAnalysisSetupErrors } from "src/app/models/accountAnalysis";
import { getAccountReportErrors } from "./validation/accountReportValidation";
import { AccountAnalysisStatusCheck } from "./accountAnalysisStatusCheck";

export class AccountReportStatusCheck {
    guid: string;
    name: string;
    status: STATUS_CHECK_OPTIONS;
    errors: AccountReportErrors;

    constructor(accountReport: IdbAccountReport, accountAnalysisStatusChecks: Array<AccountAnalysisStatusCheck>) {
        this.guid = accountReport.guid;
        this.name = accountReport.name;
        const accountAnalysisSetupErrors: Array<AccountAnalysisSetupErrors> = accountAnalysisStatusChecks.map(aasc => aasc.accountAnalysisSetupErrors);
        this.errors = getAccountReportErrors(accountReport, accountAnalysisSetupErrors);
        if (this.errors && this.errors.hasErrors) {
            this.status = 'error';
        } else {
            let linkedAnalysisItemId: string;
            if (accountReport.reportType === 'analysis') {
                linkedAnalysisItemId = accountReport.analysisReportSetup?.analysisItemId;
            } else if (accountReport.reportType === 'betterPlants') {
                linkedAnalysisItemId = accountReport.betterPlantsReportSetup?.analysisItemId;
            } else if (accountReport.reportType === 'performance') {
                linkedAnalysisItemId = accountReport.performanceReportSetup?.analysisItemId;
            } else if (accountReport.reportType === 'accountSavings') {
                linkedAnalysisItemId = accountReport.accountSavingsReportSetup?.analysisItemId;
            }
            if (!linkedAnalysisItemId) {
                //errors if no linked anlaysis so this is only
                //when on is not needed, so return good status
                this.status = 'good';
                return;
            } else {
                const linkedAnalysisStatusCheck = accountAnalysisStatusChecks.find(aasc => aasc.analysisItemId === linkedAnalysisItemId);
                if (linkedAnalysisStatusCheck?.status === 'warning') {
                    this.status = 'warning';
                } else {
                    this.status = 'good';
                }
            }
        }
    }



}