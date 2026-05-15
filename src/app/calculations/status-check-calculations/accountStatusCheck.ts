import * as _ from 'lodash';
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccount } from "src/app/models/idbModels/account";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { IdbUtilityMeterGroup } from "src/app/models/idbModels/utilityMeterGroup";
import { AccountReportErrors, AnalysisSetupErrors, FacilityReportErrors, GroupAnalysisErrors } from "src/app/models/validation";
import { FacilityStatusCheck } from "./facilityStatusCheck";
import { STATUS_CHECK_OPTIONS, StatusCheckAction } from "./statusCheckModels";
import { getGroupErrors, emptyGroupAnalysisErrors } from "src/app/shared/validation/groupAnalysisValidation";
import { getAnalysisSetupErrors, emptyAnalysisSetupErrors } from "src/app/shared/validation/analysisValidation";
import { getFacilityReportErrors, emptyFacilityReportErrors } from "src/app/shared/validation/facilityReportValidation";
import { getAccountAnalysisSetupErrors, emptyAccountAnalysisSetupErrors } from "src/app/shared/validation/accountAnalysisValidation";
import { getAccountReportErrors, emptyAccountReportErrors } from "src/app/shared/validation/accountReportValidation";
import { IdbFacilityReport } from "src/app/models/idbModels/facilityReport";
import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { IdbAccountReport } from "src/app/models/idbModels/accountReport";
import { AccountAnalysisSetupErrors } from "src/app/models/accountAnalysis";

export class AccountStatusCheck {

    facilityStatusChecks: Array<FacilityStatusCheck>;
    status: STATUS_CHECK_OPTIONS;
    actions: Array<StatusCheckAction>;

    allGroupErrors: Array<GroupAnalysisErrors>;
    analysisSetupErrors: Array<AnalysisSetupErrors>;
    facilityReportErrors: Array<FacilityReportErrors>;
    accountAnalysisSetupErrors: Array<AccountAnalysisSetupErrors>;
    accountReportErrors: Array<AccountReportErrors>;

    constructor(
        account: IdbAccount,
        facilities: Array<IdbFacility>,
        meters: Array<IdbUtilityMeter>,
        meterData: Array<IdbUtilityMeterData>,
        meterGroups: Array<IdbUtilityMeterGroup>,
        calanderizedMeters: Array<CalanderizedMeter>,
        predictors: Array<IdbPredictor>,
        predictorData: Array<IdbPredictorData>,
        facilityAnalysisItems: Array<IdbAnalysisItem>,
        facilityReports: Array<IdbFacilityReport>,
        accountAnalysisItems: Array<IdbAccountAnalysisItem>,
        accountReports: Array<IdbAccountReport>
    ) {
        this.computeGroupErrors(facilityAnalysisItems, calanderizedMeters, predictorData);
        this.computeAnalysisSetupErrors(facilityAnalysisItems, calanderizedMeters, facilities);
        this.computeFacilityReportErrors(facilityReports);
        this.computeAccountAnalysisSetupErrors(accountAnalysisItems);
        this.computeAccountReportErrors(accountReports);
        this.setAccountActions(account, facilities);
        this.facilityStatusChecks = facilities.map(facility => {
            return new FacilityStatusCheck(
                facility,
                calanderizedMeters,
                meterData,
                predictors,
                predictorData,
                facilityAnalysisItems,
                this.analysisSetupErrors,
                meters,
                meterGroups
            );
        });
        this.setStatus();
    }

    getGroupErrorsByGroupId(groupId: string, analysisId: string): GroupAnalysisErrors {
        const groupErrors = this.allGroupErrors.find(e => e.groupId === groupId && e.analysisId === analysisId);
        return groupErrors ?? emptyGroupAnalysisErrors();
    }

    getErrorsByAnalysisId(analysisId: string): AnalysisSetupErrors {
        const errors = this.analysisSetupErrors.find(e => e.analysisId === analysisId);
        return errors ?? emptyAnalysisSetupErrors();
    }

    getFacilityReportErrorsByReportId(reportId: string): FacilityReportErrors {
        const errors = this.facilityReportErrors.find(e => e.reportId === reportId);
        return errors ?? emptyFacilityReportErrors();
    }

    getAccountAnalysisErrorsByAnalysisId(analysisId: string): AccountAnalysisSetupErrors {
        const errors = this.accountAnalysisSetupErrors.find(e => e.analysisId === analysisId);
        return errors ?? emptyAccountAnalysisSetupErrors();
    }

    getAccountReportErrorsByReportId(reportId: string): AccountReportErrors {
        const errors = this.accountReportErrors.find(e => e.reportId === reportId);
        return errors ?? emptyAccountReportErrors();
    }

    private computeGroupErrors(
        analysisItems: Array<IdbAnalysisItem>,
        calanderizedMeters: Array<CalanderizedMeter>,
        predictorData: Array<IdbPredictorData>
    ) {
        this.allGroupErrors = [];
        for (const analysisItem of analysisItems) {
            for (const group of analysisItem.groups) {
                const groupErrors = getGroupErrors(group, analysisItem, calanderizedMeters, predictorData);
                this.allGroupErrors.push(groupErrors);
            }
        }
    }

    private computeAnalysisSetupErrors(
        analysisItems: Array<IdbAnalysisItem>,
        calanderizedMeters: Array<CalanderizedMeter>,
        facilities: Array<IdbFacility>
    ) {
        this.analysisSetupErrors = [];
        for (const analysisItem of analysisItems) {
            const facility = facilities.find(f => f.guid === analysisItem.facilityId);
            const groupErrorsForItem = this.allGroupErrors.filter(e => e.analysisId === analysisItem.guid);
            const errors = getAnalysisSetupErrors(analysisItem, calanderizedMeters, facility, groupErrorsForItem);
            this.analysisSetupErrors.push(errors);
        }
    }

    private computeFacilityReportErrors(facilityReports: Array<IdbFacilityReport>) {
        this.facilityReportErrors = [];
        for (const report of facilityReports) {
            const errors = getFacilityReportErrors(report, this.analysisSetupErrors);
            this.facilityReportErrors.push(errors);
        }
    }

    private computeAccountAnalysisSetupErrors(accountAnalysisItems: Array<IdbAccountAnalysisItem>) {
        this.accountAnalysisSetupErrors = [];
        for (const item of accountAnalysisItems) {
            const errors = getAccountAnalysisSetupErrors(item, this.analysisSetupErrors);
            this.accountAnalysisSetupErrors.push(errors);
        }
    }

    private computeAccountReportErrors(accountReports: Array<IdbAccountReport>) {
        this.accountReportErrors = [];
        for (const report of accountReports) {
            const errors = getAccountReportErrors(report, this.accountAnalysisSetupErrors);
            this.accountReportErrors.push(errors);
        }
    }

    private setAccountActions(account: IdbAccount, facilities: Array<IdbFacility>) {
        this.actions = [];
        if (account.name === 'New Account') {
            this.actions.push({
                label: 'Setup account settings',
                url: '/data-management/' + account.guid + '/account-setup',
                description: 'Set the account name, unit settings, location and organizational goals.',
                facilityId: undefined,
                type: 'account',
                status: 'warning',
                trackGuid: account.guid + '_setup_account'
            });
        }
        if (facilities.length === 0) {
            this.actions.push({
                label: 'Upload data',
                url: '/data-management/' + account.guid + '/import-data',
                description: "Use VERIFI's upload features to import facility data via Excel.",
                facilityId: undefined,
                type: 'account',
                status: 'error',
                trackGuid: account.guid + '_upload_data'
            });
            this.actions.push({
                label: 'Add data manually',
                url: '/data-management/' + account.guid + '/facilities',
                description: 'Create one or more facilities and enter data manually.',
                facilityId: undefined,
                type: 'account',
                status: 'error',
                trackGuid: account.guid + '_add_facility'
            });
        }
    }

    private setStatus() {
        const allStatuses: Array<STATUS_CHECK_OPTIONS> = this.facilityStatusChecks.map(fc => fc.status);
        if (allStatuses.includes('error')) {
            this.status = 'error';
        } else if (allStatuses.includes('warning')) {
            this.status = 'warning';
        } else {
            this.status = 'good';
        }
    }

    get totalActionCount(): number {
        return this.actions.length + this.facilityStatusChecks.reduce((sum, fc) => sum + fc.allActions.length, 0);
    }
}