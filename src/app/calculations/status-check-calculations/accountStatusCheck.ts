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
import { AnalysisSetupErrors } from "src/app/models/validation";
import { FacilityStatusCheck } from "./facilityStatusCheck";
import { STATUS_CHECK_OPTIONS, StatusCheckAction } from "./statusCheckModels";

export class AccountStatusCheck {

    facilityStatusChecks: Array<FacilityStatusCheck>;
    status: STATUS_CHECK_OPTIONS;
    actions: Array<StatusCheckAction>;

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
        analysisSetupErrors: Array<AnalysisSetupErrors>
    ) {
        this.setAccountActions(account, facilities);
        this.facilityStatusChecks = facilities.map(facility => {
            return new FacilityStatusCheck(
                facility,
                calanderizedMeters,
                meterData,
                predictors,
                predictorData,
                facilityAnalysisItems,
                analysisSetupErrors,
                meters,
                meterGroups
            );
        });
        this.setStatus();
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