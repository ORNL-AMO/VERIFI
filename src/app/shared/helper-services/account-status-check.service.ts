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
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisSetupErrors, FacilityReportErrors, AccountReportErrors, GroupAnalysisErrors } from 'src/app/models/validation';
import { AccountAnalysisSetupErrors } from 'src/app/models/accountAnalysis';
import { emptyAnalysisSetupErrors } from '../../calculations/status-check-calculations/validation/analysisValidation';
import { emptyGroupAnalysisErrors } from '../../calculations/status-check-calculations/validation/groupAnalysisValidation';
import { emptyFacilityReportErrors } from '../../calculations/status-check-calculations/validation/facilityReportValidation';
import { emptyAccountAnalysisSetupErrors } from '../../calculations/status-check-calculations/validation/accountAnalysisValidation';
import { emptyAccountReportErrors } from '../../calculations/status-check-calculations/validation/accountReportValidation';

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
        private facilityReportsDbService: FacilityReportsDbService,
        private accountAnalysisDbService: AccountAnalysisDbService,
        private accountReportDbService: AccountReportDbService
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
            this.facilityReportsDbService.accountFacilityReports,
            this.accountAnalysisDbService.accountAnalysisItems,
            this.accountReportDbService.accountReports
        ]).pipe(
            debounceTime(300)
        ).subscribe(([
            account,
            facilities,
            meters,
            meterData,
            meterGroups,
            calendarizedMeters,
            predictors,
            predictorData,
            analysisItems,
            facilityReports,
            accountAnalysisItems,
            accountReports
        ]) => {
            if (!account || !facilities || !meters || !meterData || !meterGroups || !calendarizedMeters || !predictors || !predictorData || !analysisItems) {
                return;
            }
            const facilityReportsForAccount = (facilityReports ?? []).filter(report => report.accountId === account.guid);
            const accountAnalysisItemsForAccount = (accountAnalysisItems ?? []).filter(item => item.accountId === account.guid);
            const accountReportsForAccount = (accountReports ?? []).filter(report => report.accountId === account.guid);
            const isConsistentSnapshot = this.isCollectionForAccount(facilities, account.guid, facility => facility.accountId) &&
                this.isCollectionForAccount(meters, account.guid, meter => meter.accountId) &&
                this.isCollectionForAccount(meterData, account.guid, data => data.accountId) &&
                this.isCollectionForAccount(meterGroups, account.guid, group => group.accountId) &&
                this.isCollectionForAccount(calendarizedMeters, account.guid, calendarizedMeter => calendarizedMeter.meter.accountId) &&
                this.isCollectionForAccount(predictors, account.guid, predictor => predictor.accountId) &&
                this.isCollectionForAccount(predictorData, account.guid, data => data.accountId) &&
                this.isCollectionForAccount(analysisItems, account.guid, item => item.accountId) &&
                this.isCollectionForAccount(facilityReports ?? [], account.guid, report => report.accountId) &&
                this.isCollectionForAccount(accountAnalysisItems ?? [], account.guid, item => item.accountId) &&
                this.isCollectionForAccount(accountReports ?? [], account.guid, report => report.accountId);
            if (!isConsistentSnapshot) {
                this.accountStatusCheck.next(undefined);
                return;
            }
            const statusCheck = new AccountStatusCheck(
                account,
                facilities,
                meters,
                meterData,
                meterGroups,
                calendarizedMeters,
                predictors,
                predictorData,
                analysisItems,
                facilityReportsForAccount,
                accountAnalysisItemsForAccount,
                accountReportsForAccount
            );
            this.accountStatusCheck.next(statusCheck);
        });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    getGroupErrorsByGroupId(groupId: string, analysisId: string): GroupAnalysisErrors {
        return this.accountStatusCheck.getValue()?.getGroupErrorsByGroupId(groupId, analysisId) ?? emptyGroupAnalysisErrors();
    }

    getErrorsByAnalysisId(analysisId: string): AnalysisSetupErrors {
        return this.accountStatusCheck.getValue()?.getErrorsByAnalysisId(analysisId) ?? emptyAnalysisSetupErrors();
    }

    getFacilityReportErrorsByReportId(reportId: string): FacilityReportErrors {
        return this.accountStatusCheck.getValue()?.getFacilityReportErrorsByReportId(reportId) ?? emptyFacilityReportErrors();
    }

    getAccountAnalysisErrorsByAnalysisId(analysisId: string): AccountAnalysisSetupErrors {
        return this.accountStatusCheck.getValue()?.getAccountAnalysisErrorsByAnalysisId(analysisId) ?? emptyAccountAnalysisSetupErrors();
    }

    getAccountReportErrorsByReportId(reportId: string): AccountReportErrors {
        return this.accountStatusCheck.getValue()?.getAccountReportErrorsByReportId(reportId) ?? emptyAccountReportErrors();
    }

    private isCollectionForAccount<T>(items: Array<T>, accountId: string, getAccountId: (item: T) => string): boolean {
        return items.every(item => getAccountId(item) === accountId);
    }

}
