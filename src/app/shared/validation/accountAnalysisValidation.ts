import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { getAnalysisSetupErrors } from "./analysisValidation";
import { AnalysisSetupErrors } from "src/app/models/analysis";
import { AccountAnalysisSetupErrors } from "src/app/models/accountAnalysis";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { checkNumberValueValid } from "./validationHelpers";

export function getAccountAnalysisSetupErrors(analysisItem: IdbAccountAnalysisItem, allAnalysisItems: Array<IdbAnalysisItem>, calendarizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, facilityPredictorData: Array<IdbPredictorData>): AccountAnalysisSetupErrors {
    let missingName: boolean = (analysisItem.name == undefined || analysisItem.name == '');
    let missingBaselineYear: boolean = checkNumberValueValid(analysisItem.baselineYear) == false;
    let hasSetupError: boolean = (missingName || missingBaselineYear);
    let facilitiesSelectionsErrors: Array<boolean> = [];
    if (analysisItem.facilityAnalysisItems) {
        analysisItem.facilityAnalysisItems.forEach(item => {
            if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
                let analysisItem: IdbAnalysisItem = allAnalysisItems.find(analysisItem => { return analysisItem.guid == item.analysisItemId });
                let facility: IdbFacility = facilities.find(facility => { return facility.guid == item.facilityId });
                let analysisItemErrors: AnalysisSetupErrors = getAnalysisSetupErrors(analysisItem, calendarizedMeters, facility, facilityPredictorData);
                if (analysisItemErrors.hasError || analysisItemErrors.groupsHaveErrors) {
                    facilitiesSelectionsErrors.push(true)
                } else {
                    facilitiesSelectionsErrors.push(false);
                }
            } else {
                if (item.analysisItemId == 'skip') {
                    facilitiesSelectionsErrors.push(false);
                } else {
                    facilitiesSelectionsErrors.push(true);
                }
            }
        });
    }
    let facilitiesSelectionsInvalid: boolean = facilitiesSelectionsErrors.includes(true);
    return {
        hasError: hasSetupError || facilitiesSelectionsInvalid,
        hasSetupErrors: hasSetupError,
        missingName: missingName,
        missingBaselineYear: missingBaselineYear,
        facilitiesSelectionsInvalid: facilitiesSelectionsInvalid
    }
}

// export function updateFacilitySelectionErrors(analysisItem: IdbAccountAnalysisItem, allAnalysisItems: Array<IdbAnalysisItem>): { analysisItem: IdbAccountAnalysisItem, isChanged: boolean } {
//     let facilitiesSelectionsErrors: Array<boolean> = [];
//     analysisItem.facilityAnalysisItems.forEach(item => {
//         if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
//             let analysisItem: IdbAnalysisItem = allAnalysisItems.find(analysisItem => { return analysisItem.guid == item.analysisItemId });
//             if (analysisItem.setupErrors.hasError || analysisItem.setupErrors.groupsHaveErrors) {
//                 facilitiesSelectionsErrors.push(true)
//             } else {
//                 facilitiesSelectionsErrors.push(false);
//             }
//         } else {
//             if (item.analysisItemId == 'skip') {
//                 facilitiesSelectionsErrors.push(false);
//             } else {
//                 facilitiesSelectionsErrors.push(true);
//             }
//         }
//     });
//     let facilitiesSelectionsInvalid: boolean = facilitiesSelectionsErrors.includes(true);
//     let isChanged: boolean = false;
//     if (facilitiesSelectionsInvalid != analysisItem.setupErrors.facilitiesSelectionsInvalid) {
//         analysisItem.setupErrors.facilitiesSelectionsInvalid = facilitiesSelectionsInvalid;
//         isChanged = true;
//     }
//     return { analysisItem: analysisItem, isChanged: isChanged };
// }