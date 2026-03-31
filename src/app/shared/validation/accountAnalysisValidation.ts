import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { getAnalysisSetupErrors } from "./analysisValidation";
import { AnalysisSetupErrors } from "src/app/models/validation";
import { AccountAnalysisSetupErrors } from "src/app/models/accountAnalysis";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { checkNumberValueValid } from "./validationHelpers";

export function getAccountAnalysisSetupErrors(analysisItem: IdbAccountAnalysisItem, allAnalysisItems: Array<IdbAnalysisItem>, calendarizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, facilityPredictorData: Array<IdbPredictorData>): AccountAnalysisSetupErrors {
    let missingName: boolean = (analysisItem.name == undefined || analysisItem.name == '');
    let missingBaselineYear: boolean = checkNumberValueValid(analysisItem.baselineYear) == false;
    let hasSetupError: boolean = (missingName || missingBaselineYear);
    let facilitiesSelectionsInvalid: boolean = false;
    if (calendarizedMeters.length != 0) {
        if (analysisItem.facilityAnalysisItems) {
            for (const item of analysisItem.facilityAnalysisItems) {
                let invalid = false;
                if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
                    let analysisItemObj: IdbAnalysisItem = allAnalysisItems.find(analysisItem => analysisItem.guid == item.analysisItemId);
                    if (analysisItemObj) {
                        let facility: IdbFacility = facilities.find(facility => facility.guid == item.facilityId);
                        if (facility) {
                            let analysisItemErrors: AnalysisSetupErrors = getAnalysisSetupErrors(analysisItemObj, calendarizedMeters, facility, facilityPredictorData);
                            if (analysisItemErrors.hasError || analysisItemErrors.groupsHaveErrors) {
                                invalid = true;
                            }
                        }
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
        }
    }
    return {
        hasError: hasSetupError || facilitiesSelectionsInvalid,
        hasSetupErrors: hasSetupError,
        missingName: missingName,
        missingBaselineYear: missingBaselineYear,
        facilitiesSelectionsInvalid: facilitiesSelectionsInvalid
    }
}