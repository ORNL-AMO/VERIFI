import { Injectable } from "@angular/core";
import { AnalysisSetupErrors } from "src/app/models/validation";
import { BehaviorSubject } from "rxjs";
import { AccountAnalysisDbService } from "src/app/indexedDB/account-analysis-db.service";
import { AccountAnalysisSetupErrors } from "src/app/models/accountAnalysis";
import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { emptyAccountAnalysisSetupErrors, getAccountAnalysisSetupErrors } from "../accountAnalysisValidation";
import { AnalysisValidationService } from "./analysis-validation.service";

@Injectable({
    providedIn: 'root'
})
export class AccountAnalysisValidationService {


    accountAnalysisSetupErrors: BehaviorSubject<Array<AccountAnalysisSetupErrors>> = new BehaviorSubject<Array<AccountAnalysisSetupErrors>>([]);
    constructor(private analysisValidationService: AnalysisValidationService,
        private accountAnalysisDbService: AccountAnalysisDbService
    ) {
        this.accountAnalysisDbService.accountAnalysisItems.subscribe(analysisItems => {
            this.setAnalysisSetupErrors();
        });

        this.analysisValidationService.analysisSetupErrors.subscribe(setupErrors => {
            this.setAnalysisSetupErrors();
        });
    }

    setAnalysisSetupErrors() {
        let analysisSetupErrors: Array<AnalysisSetupErrors> = this.analysisValidationService.analysisSetupErrors.getValue();
        let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
        let accountAnalysisSetupErrors: Array<AccountAnalysisSetupErrors> = [];
        let sameAccount: boolean = this.checkSameAccount(accountAnalysisItems, analysisSetupErrors);
        if (sameAccount) {
            if (accountAnalysisItems.length != 0 && analysisSetupErrors.length != 0) {
                accountAnalysisItems.forEach(analysisItem => {
                    let itemSetupErrors: AccountAnalysisSetupErrors = getAccountAnalysisSetupErrors(analysisItem, analysisSetupErrors);
                    accountAnalysisSetupErrors.push(itemSetupErrors);
                })
                this.accountAnalysisSetupErrors.next(accountAnalysisSetupErrors);
            }
        }
    }

    getErrorsByAccountAnalysisId(accountAnalysisId: string): AccountAnalysisSetupErrors {
        let allSetupErrors: Array<AccountAnalysisSetupErrors> = this.accountAnalysisSetupErrors.getValue();
        let setupErrors: AccountAnalysisSetupErrors = allSetupErrors.find(setupError => setupError.analysisId == accountAnalysisId);
        if (setupErrors) {
            return setupErrors;
        } else {
            return emptyAccountAnalysisSetupErrors();
        }
    }


    checkSameAccount(analysisItems: Array<IdbAccountAnalysisItem>, analysisSetupErrors: Array<AnalysisSetupErrors>): boolean {
        let accountIds: Array<string> = analysisItems.map(item => item.accountId);
        let analysisAccounts: Array<string> = analysisSetupErrors.map(error => error.accountId);
        let allAccounts = accountIds.concat(analysisAccounts);
        let uniqueAccounts = new Set(allAccounts);
        return uniqueAccounts.size == 1;
    }
}