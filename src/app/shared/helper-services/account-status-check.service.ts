import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizationService } from './calanderization.service';
import { AnalysisValidationService } from '../validation/services/analysis-validation.service';

@Injectable({
    providedIn: 'root'
})
export class AccountStatusCheckService implements OnDestroy {

    accountStatusCheck: BehaviorSubject<AccountStatusCheck | undefined> = new BehaviorSubject<AccountStatusCheck | undefined>(undefined);

    selectedFacilityStatusCheck$: Observable<FacilityStatusCheck | undefined>;

    private sub: Subscription;

    constructor(
        private accountDbService: AccountdbService,
        private facilityDbService: FacilitydbService,
        private utilityMeterDbService: UtilityMeterdbService,
        private utilityMeterDataDbService: UtilityMeterDatadbService,
        private utilityMeterGroupDbService: UtilityMeterGroupdbService,
        private calanderizationService: CalanderizationService,
        private predictorDbService: PredictorDbService,
        private predictorDataDbService: PredictorDataDbService,
        private analysisDbService: AnalysisDbService,
        private analysisValidationService: AnalysisValidationService
    ) {
        this.selectedFacilityStatusCheck$ = combineLatest([
            this.accountStatusCheck,
            this.facilityDbService.selectedFacility
        ]).pipe(
            map(([accountCheck, facility]) =>
                accountCheck?.facilityStatusChecks.find(fc => fc.facility.guid === facility?.guid)
            )
        );

        this.sub = combineLatest([
            this.accountDbService.selectedAccount,
            this.facilityDbService.accountFacilities,
            this.utilityMeterDbService.accountMeters,
            this.utilityMeterDataDbService.accountMeterData,
            this.utilityMeterGroupDbService.accountMeterGroups,
            this.calanderizationService.calanderizedMeters,
            this.predictorDbService.accountPredictors,
            this.predictorDataDbService.accountPredictorData,
            this.analysisDbService.accountAnalysisItems,
            this.analysisValidationService.analysisSetupErrors
        ]).pipe(
            debounceTime(300)
        ).subscribe(([
            account,
            facilities,
            meters,
            meterData,
            meterGroups,
            calanderizedMeters,
            predictors,
            predictorData,
            analysisItems,
            analysisSetupErrors
        ]) => {
            if (!account || !facilities || !meters || !meterData || !meterGroups || !calanderizedMeters || !predictors || !predictorData || !analysisItems || !analysisSetupErrors) {
                return;
            }
            if (meters.length != calanderizedMeters.length) {
                return;
            }
            const statusCheck = new AccountStatusCheck(
                account,
                facilities,
                meters,
                meterData,
                meterGroups,
                calanderizedMeters,
                predictors,
                predictorData,
                analysisItems,
                analysisSetupErrors
            );
            this.accountStatusCheck.next(statusCheck);
        });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

}
