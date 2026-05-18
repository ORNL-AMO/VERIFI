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
import { emptyGroupAnalysisErrors } from "src/app/calculations/status-check-calculations/validation/groupAnalysisValidation";
import { emptyAnalysisSetupErrors } from "src/app/calculations/status-check-calculations/validation/analysisValidation";
import { getAccountAnalysisSetupErrors, emptyAccountAnalysisSetupErrors } from "src/app/calculations/status-check-calculations/validation/accountAnalysisValidation";
import { getAccountReportErrors, emptyAccountReportErrors } from "src/app/calculations/status-check-calculations/validation/accountReportValidation";
import { IdbFacilityReport } from "src/app/models/idbModels/facilityReport";
import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { IdbAccountReport } from "src/app/models/idbModels/accountReport";
import { AccountAnalysisSetupErrors } from "src/app/models/accountAnalysis";
import { AnalysisStatusCheck } from './analysisStatusCheck';
import { AnalysisGroupStatusCheck } from './analysisGroupStatusCheck';

export class AccountStatusCheck {

    facilityStatusChecks: Array<FacilityStatusCheck>;
    status: STATUS_CHECK_OPTIONS;
    actions: Array<StatusCheckAction>;

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
        this.facilityStatusChecks = facilities.map(facility => {
            return new FacilityStatusCheck(
                facility,
                calanderizedMeters,
                meterData,
                predictors,
                predictorData,
                facilityAnalysisItems,
                meters,
                meterGroups,
                facilityReports
            );
        });
        this.computeAccountAnalysisSetupErrors(accountAnalysisItems);
        this.computeAccountReportErrors(accountReports);
        this.setAccountActions(account, facilities);
        this.setStatus();
    }

    getAnalysisStatusById(analysisId: string): AnalysisStatusCheck | undefined {
        const analysisStatusChecks: Array<AnalysisStatusCheck> = this.facilityStatusChecks.flatMap(fc => fc.analysisStatusChecks);
        return analysisStatusChecks.find(asc => asc.analysisItem.guid === analysisId);
    }

    getGroupErrorsByGroupId(groupId: string, analysisId: string): GroupAnalysisErrors {
        const analysisStatusCheck: AnalysisStatusCheck | undefined = this.getAnalysisStatusById(analysisId);
        const groupStatusCheck: AnalysisGroupStatusCheck | undefined = analysisStatusCheck?.getGroupStatusChecksByGroupId(groupId);
        const groupErrors: GroupAnalysisErrors | undefined = groupStatusCheck?.groupAnalysisErrors;
        return groupErrors ?? emptyGroupAnalysisErrors();
    }

    getErrorsByAnalysisId(analysisId: string): AnalysisSetupErrors {
        const analysisStatusCheck: AnalysisStatusCheck | undefined = this.getAnalysisStatusById(analysisId);
        const errors = analysisStatusCheck?.analysisSetupErrors;
        return errors ?? emptyAnalysisSetupErrors();
    }

    getFacilityReportErrorsByReportId(reportId: string): FacilityReportErrors {
        const facilityReportStatusChecks: Array<FacilityReportErrors> = this.facilityStatusChecks.flatMap(fc => fc.facilityReportErrors);
        return facilityReportStatusChecks.find(fr => fr.reportId === reportId);
    }

    getAccountAnalysisErrorsByAnalysisId(analysisId: string): AccountAnalysisSetupErrors {
        const errors = this.accountAnalysisSetupErrors.find(e => e.analysisId === analysisId);
        return errors ?? emptyAccountAnalysisSetupErrors();
    }

    getAccountReportErrorsByReportId(reportId: string): AccountReportErrors {
        const errors = this.accountReportErrors.find(e => e.reportId === reportId);
        return errors ?? emptyAccountReportErrors();
    }

    private computeAccountAnalysisSetupErrors(accountAnalysisItems: Array<IdbAccountAnalysisItem>) {
        this.accountAnalysisSetupErrors = [];
        const analysisStatusChecks: Array<AnalysisStatusCheck> = this.facilityStatusChecks.flatMap(fc => fc.analysisStatusChecks)
        const analysisSetupErrors: Array<AnalysisSetupErrors> = analysisStatusChecks.map(asc => asc.analysisSetupErrors);
        for (const item of accountAnalysisItems) {
            const errors = getAccountAnalysisSetupErrors(item, analysisSetupErrors);
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