import { AccountReportErrors } from "src/app/models/validation";
import { STATUS_CHECK_OPTIONS } from "./statusCheckModels";
import { IdbAccountReport } from "src/app/models/idbModels/accountReport";
import { AccountAnalysisSetupErrors } from "src/app/models/accountAnalysis";
import { getAccountReportErrors } from "./validation/accountReportValidation";

export class AccountReportStatusCheck {
    guid: string;
    name: string;
    status: STATUS_CHECK_OPTIONS;
    errors: AccountReportErrors;

    constructor(accountReport: IdbAccountReport, accountAnalysisSetupErrors: Array<AccountAnalysisSetupErrors>) {
        this.guid = accountReport.guid;
        this.name = accountReport.name;
        this.errors = getAccountReportErrors(accountReport, accountAnalysisSetupErrors);
        if (this.errors && this.errors.hasErrors) {
            this.status = 'error';
        } else {
            this.status = 'good';
        }
    }



}