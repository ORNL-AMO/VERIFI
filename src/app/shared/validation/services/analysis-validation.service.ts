import { Injectable } from "@angular/core";
import { CalanderizationService } from "../../helper-services/calanderization.service";
import { AnalysisDbService } from "src/app/indexedDB/analysis-db.service";
import { AnalysisGroupValidationService } from "./analysis-group-validation.service";
import { AnalysisSetupErrors, GroupAnalysisErrors } from "src/app/models/validation";
import { BehaviorSubject } from "rxjs";
import { FacilitydbService } from "src/app/indexedDB/facility-db.service";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { emptyAnalysisSetupErrors, getAnalysisSetupErrors } from "../analysisValidation";
import { IdbFacility } from "src/app/models/idbModels/facility";

@Injectable({
    providedIn: 'root'
})
export class AnalysisValidationService {


    analysisSetupErrors: BehaviorSubject<Array<AnalysisSetupErrors>> = new BehaviorSubject<Array<AnalysisSetupErrors>>([]);
    constructor(private analysisGroupValidationService: AnalysisGroupValidationService,
        private calanderizationService: CalanderizationService,
        private analysisDbService: AnalysisDbService,
        private facilityDbService: FacilitydbService,
    ) {
        this.analysisDbService.accountAnalysisItems.subscribe(analysisItems => {
            this.setAnalysisSetupErrors();
        });

        this.analysisGroupValidationService.allGroupErrors.subscribe(allGroupErrors => {
            this.setAnalysisSetupErrors();
        });
    }

    setAnalysisSetupErrors() {
        let groupErrors: Array<GroupAnalysisErrors> = this.analysisGroupValidationService.allGroupErrors.getValue();
        let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.calanderizedMeters.getValue();
        let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
        let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        let allAnalysisSetupErrors: Array<AnalysisSetupErrors> = [];
        if (facilities.length != 0 && groupErrors.length != 0 && calanderizedMeters.length != 0 && analysisItems.length != 0) {
            analysisItems.forEach(analysisItem => {
                let groupErrorsForItem: Array<GroupAnalysisErrors> = groupErrors.filter(groupError => groupError.analysisId == analysisItem.guid);
                let facility: IdbFacility = facilities.find(fac => fac.guid == analysisItem.facilityId);
                let analysisSetupErrors: AnalysisSetupErrors = getAnalysisSetupErrors(analysisItem, calanderizedMeters, facility, groupErrorsForItem);
                allAnalysisSetupErrors.push(analysisSetupErrors);
            })
            this.analysisSetupErrors.next(allAnalysisSetupErrors);
        }
    }

    getErrorsByAnalysisId(analysisId: string): AnalysisSetupErrors {
        let allSetupErrors: Array<AnalysisSetupErrors> = this.analysisSetupErrors.getValue();
        let setupErrors: AnalysisSetupErrors = allSetupErrors.find(setupError => setupError.analysisId == analysisId);
        if (setupErrors) {
            return setupErrors;
        } else {
            return emptyAnalysisSetupErrors();
        }
    }
}