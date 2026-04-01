import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { AnalysisSetupErrors } from "src/app/models/validation";
import { AccountAnalysisSetupErrors } from "src/app/models/accountAnalysis";
import { checkNumberValueValid } from "./validationHelpers";

export function getAccountAnalysisSetupErrors(analysisItem: IdbAccountAnalysisItem, allAnalysisSetupErrors: Array<AnalysisSetupErrors>): AccountAnalysisSetupErrors {
    let missingName: boolean = (analysisItem.name == undefined || analysisItem.name == '');
    let missingBaselineYear: boolean = checkNumberValueValid(analysisItem.baselineYear) == false;
    let hasSetupError: boolean = (missingName || missingBaselineYear);
    let facilitiesSelectionsInvalid: boolean = false;
    if (analysisItem.facilityAnalysisItems) {
        for (const item of analysisItem.facilityAnalysisItems) {
            let invalid = false;
            if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
                let analysisSetupErrors: AnalysisSetupErrors = allAnalysisSetupErrors.find(error => error.analysisId == item.analysisItemId);
                if (analysisSetupErrors == undefined) {
                    invalid = true;
                } else if (analysisSetupErrors.hasError || analysisSetupErrors.groupsHaveErrors) {
                    invalid = true;
                }
            } else {
                if (item.analysisItemId != 'skip') {
                    invalid = true;
                }
            }
            if (invalid) {
                facilitiesSelectionsInvalid = true;
                break;
            }
        }
    } else {
        facilitiesSelectionsInvalid = true;
    }
    return {
        analysisId: analysisItem.guid,
        hasError: hasSetupError || facilitiesSelectionsInvalid,
        hasSetupErrors: hasSetupError,
        missingName: missingName,
        missingBaselineYear: missingBaselineYear,
        facilitiesSelectionsInvalid: facilitiesSelectionsInvalid,
        accountId: analysisItem.accountId
    }
}

export function emptyAccountAnalysisSetupErrors(): AccountAnalysisSetupErrors {
    return {
        analysisId: '',
        hasError: false,
        hasSetupErrors: false,
        missingName: false,
        missingBaselineYear: false,
        facilitiesSelectionsInvalid: false,
        accountId: ''
    }
}