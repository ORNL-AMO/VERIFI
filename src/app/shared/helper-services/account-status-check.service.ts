import { Injectable, OnDestroy } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { FacilityStatusCheck } from '@domain/calculations/status-check-calculations/facilityStatusCheck';
import { AccountStatusCheck } from '@domain/calculations/status-check-calculations/accountStatusCheck';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CalanderizationService, CalendarizationState } from '@shared/helper-services/calanderization.service';
import { AnalysisSetupErrors, GroupAnalysisErrors } from '@data/models/validation';
import { AccountAnalysisSetupErrors } from '@data/models/accountAnalysis';
import { emptyAnalysisSetupErrors } from '@domain/calculations/status-check-calculations/validation/analysisValidation';
import { emptyGroupAnalysisErrors } from '@domain/calculations/status-check-calculations/validation/groupAnalysisValidation';
import { emptyAccountAnalysisSetupErrors } from '@domain/calculations/status-check-calculations/validation/accountAnalysisValidation';

@Injectable({
    providedIn: 'root'
})
export class AccountStatusCheckService implements OnDestroy {
    accountStatusCheck: BehaviorSubject<AccountStatusCheck | undefined> = new BehaviorSubject<AccountStatusCheck | undefined>(undefined);
    calendarizationState: BehaviorSubject<CalendarizationState>;

    selectedFacilityStatusCheck$: Observable<FacilityStatusCheck | undefined>;

    private sub: Subscription;

    constructor(
        private accountWorkspaceStore: AccountWorkspaceStore,
        private calanderizationService: CalanderizationService
    ) {
        this.calendarizationState = this.calanderizationService.calendarizationState;
        this.selectedFacilityStatusCheck$ = combineLatest([
            this.accountStatusCheck,
            toObservable(this.accountWorkspaceStore.selectedFacility)
        ]).pipe(
            map(([accountCheck, facility]) =>
                accountCheck?.facilityStatusChecks.find(fc => fc.facility.guid === facility?.guid)
            )
        );

        this.sub = combineLatest([
            toObservable(this.accountWorkspaceStore.snapshot),
            this.calendarizationState
        ]).subscribe(([
            snapshot,
            calendarizationState
        ]) => {
            if (!snapshot
                || calendarizationState.status !== 'ready'
                || calendarizationState.workspaceSnapshot !== snapshot
                || calendarizationState.accountGuid !== snapshot.account.guid
                || calendarizationState.workspaceRevision !== this.accountWorkspaceStore.revision()) {
                this.accountStatusCheck.next(undefined);
                return;
            }
            const calendarizedMeters = calendarizationState.calanderizedMeters;
            const account = snapshot?.account;
            const facilities = snapshot ? [...snapshot.facilities] : undefined;
            const meters = snapshot ? [...snapshot.meters] : undefined;
            const meterData = snapshot ? [...snapshot.meterData] : undefined;
            const meterGroups = snapshot ? [...snapshot.meterGroups] : undefined;
            const predictors = snapshot ? [...snapshot.predictors] : undefined;
            const predictorData = snapshot ? [...snapshot.predictorData] : undefined;
            const analysisItems = snapshot ? [...snapshot.facilityAnalyses] : undefined;
            const facilityReports = snapshot ? [...snapshot.facilityReports] : undefined;
            const accountAnalysisItems = snapshot ? [...snapshot.accountAnalyses] : undefined;
            const accountReports = snapshot ? [...snapshot.accountReports] : undefined;
            if (!account || !facilities || !meters || !meterData || !meterGroups || !calendarizedMeters || !predictors || !predictorData || !analysisItems) {
                return;
            }
            const facilityReportsForAccount = (facilityReports ?? []).filter(report => report.accountId === account.guid);
            const facilitiesForAccount = [...facilities];
            const accountAnalysisItemsForAccount = (accountAnalysisItems ?? []).filter(item => item.accountId === account.guid);
            const accountReportsForAccount = (accountReports ?? []).filter(report => report.accountId === account.guid);
            const isConsistentSnapshot = this.isCollectionForAccount(facilitiesForAccount, account.guid, facility => facility.accountId) &&
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
                facilitiesForAccount,
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

    getAccountAnalysisErrorsByAnalysisId(analysisId: string): AccountAnalysisSetupErrors {
        return this.accountStatusCheck.getValue()?.getAccountAnalysisErrorsByAnalysisId(analysisId) ?? emptyAccountAnalysisSetupErrors();
    }

    retryCalendarization(): void {
        this.calanderizationService.recalculateCurrentWorkspace();
    }

    private isCollectionForAccount<T>(items: Array<T>, accountId: string, getAccountId: (item: T) => string): boolean {
        return items.every(item => getAccountId(item) === accountId);
    }

}
