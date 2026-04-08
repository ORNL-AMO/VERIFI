import { Injectable } from "@angular/core";
import { AccountReportErrors } from "src/app/models/validation";
import { BehaviorSubject } from "rxjs";
import { AccountReportDbService } from "src/app/indexedDB/account-report-db.service";
import { AccountAnalysisValidationService } from "./account-analysis-validation.service";
import { emptyAccountReportErrors, getAccountReportErrors } from "../accountReportValidation";
import { IdbAccountReport } from "src/app/models/idbModels/accountReport";
import { AccountAnalysisSetupErrors } from "src/app/models/accountAnalysis";

@Injectable({
    providedIn: 'root'
})
export class AccountReportValidationService {


    accountReportErrors: BehaviorSubject<Array<AccountReportErrors>> = new BehaviorSubject<Array<AccountReportErrors>>([]);
    constructor(private accountReportDbService: AccountReportDbService,
        private accountAnalysisValidationService: AccountAnalysisValidationService
    ) {
        this.accountAnalysisValidationService.accountAnalysisSetupErrors.subscribe(setupErrors => {
            this.setAccountReportErrors();
        });

        this.accountReportDbService.accountReports.subscribe(accountReports => {
            this.setAccountReportErrors();
        });

    }

    setAccountReportErrors() {
        let accountReports: Array<IdbAccountReport> = this.accountReportDbService.accountReports.getValue();
        let analysisSetupErrors: Array<AccountAnalysisSetupErrors> = this.accountAnalysisValidationService.accountAnalysisSetupErrors.getValue();
        //can conflict when switching between accounts
        //checking for same account across all items
        let sameAccount: boolean = this.checkSameAccount(accountReports, analysisSetupErrors);
        if (sameAccount) {
            let allReportErrors: Array<AccountReportErrors> = [];
            if (accountReports.length != 0 && analysisSetupErrors.length != 0) {
                accountReports.forEach(accountReport => {
                    let reportErrors: AccountReportErrors = getAccountReportErrors(accountReport, analysisSetupErrors);
                    allReportErrors.push(reportErrors);
                });
                this.accountReportErrors.next(allReportErrors);
            }
        }
    }

    getErrorsByReportId(reportId: string): AccountReportErrors {
        let allReportErrors: Array<AccountReportErrors> = this.accountReportErrors.getValue();
        let reportErrors: AccountReportErrors = allReportErrors.find(error => error.reportId == reportId);
        if (reportErrors) {
            return reportErrors;
        } else {
            return emptyAccountReportErrors();
        }
    }

    checkSameAccount(accountReports: Array<IdbAccountReport>, analysisSetupErrors: Array<AccountAnalysisSetupErrors>): boolean {
        let reportAccounts: Array<string> = accountReports.map(report => report.accountId);
        let analysisAccounts: Array<string> = analysisSetupErrors.map(error => error.accountId);
        let allAccounts = reportAccounts.concat(analysisAccounts);
        let uniqueAccounts = new Set(allAccounts);
        return uniqueAccounts.size == 1;
    }
}