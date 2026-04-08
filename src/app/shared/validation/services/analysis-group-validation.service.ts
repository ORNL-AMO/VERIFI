import { Injectable } from "@angular/core";
import { CalanderizationService } from "../../helper-services/calanderization.service";
import { PredictorDataDbService } from "src/app/indexedDB/predictor-data-db.service";
import { AnalysisDbService } from "src/app/indexedDB/analysis-db.service";
import { BehaviorSubject } from "rxjs";
import { GroupAnalysisErrors } from "src/app/models/validation";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { emptyGroupAnalysisErrors, getGroupErrors } from "../groupAnalysisValidation";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { CalanderizedMeter } from "src/app/models/calanderization";

@Injectable({
    providedIn: 'root'
})
export class AnalysisGroupValidationService {


    allGroupErrors: BehaviorSubject<Array<GroupAnalysisErrors>> = new BehaviorSubject<Array<GroupAnalysisErrors>>([]);
    constructor(private calanderizationService: CalanderizationService,
        private predictorDataDbService: PredictorDataDbService,
        private analysisDbService: AnalysisDbService
    ) {
        this.analysisDbService.accountAnalysisItems.subscribe(accountAnalysisItems => {
            this.setGroupErrors();
        });
        this.calanderizationService.calanderizedMeters.subscribe(calanderizedMeters => {
            this.setGroupErrors();
        });
        this.predictorDataDbService.accountPredictorData.subscribe(predictorDataItems => {
            this.setGroupErrors();
        });
    }

    setGroupErrors() {
        let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
        let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.calanderizedMeters.getValue();
        let predictorDataItems: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
        let allGroupErrors: Array<GroupAnalysisErrors> = [];
        if (analysisItems.length != 0 && predictorDataItems.length != 0 && calanderizedMeters.length != 0) {
            //check items are all from same account
            //can conflict when switching between accounts
            let sameAccounts: boolean = this.checkSameAccounts(analysisItems, predictorDataItems, calanderizedMeters);
            if (sameAccounts) {
                analysisItems.forEach(analysisItem => {
                    analysisItem.groups.forEach(group => {
                        let groupErrors: GroupAnalysisErrors = getGroupErrors(group, analysisItem, calanderizedMeters, predictorDataItems)
                        allGroupErrors.push(groupErrors);
                    });
                })
                this.allGroupErrors.next(allGroupErrors);
            }else{
                this.allGroupErrors.next([]);
            }
        }
    }

    getGroupErrorsByGroupId(groupId: string, analysisId: string): GroupAnalysisErrors {
        let allGroupErrors: Array<GroupAnalysisErrors> = this.allGroupErrors.getValue();
        let groupErrors: GroupAnalysisErrors = allGroupErrors.find(groupError => groupError.groupId == groupId && groupError.analysisId == analysisId);
        if (groupErrors) {
            return groupErrors;
        } else {
            return emptyGroupAnalysisErrors();
        }
    }

    checkSameAccounts(analysisItems: Array<IdbAnalysisItem>, predictorDataItems: Array<IdbPredictorData>, calanderizedMeters: Array<CalanderizedMeter>): boolean {
        let accounts: Array<string> = analysisItems.map(item => item.accountId);
        let predictorAccounts: Array<string> = predictorDataItems.map(item => item.accountId);
        let meterAccounts: Array<string> = calanderizedMeters.map(meter => meter.meter.accountId);
        let allAccounts = accounts.concat(predictorAccounts).concat(meterAccounts);
        let uniqueAccounts = new Set(allAccounts);
        return uniqueAccounts.size == 1;
    }
}