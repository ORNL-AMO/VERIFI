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
        const outdatedDays = account.toDoListOutdatedDays ?? 60;
        this.setAccountActions(account, facilities);
        this.facilityStatusChecks = facilities.map(facility => {
            const facilityMeters = meters.filter(m => m.facilityId === facility.guid);
            const facilityMeterData = meterData.filter(d => d.facilityId === facility.guid);
            const facilityMeterGroups = meterGroups.filter(g => g.facilityId === facility.guid);
            const facilityPredictors = predictors.filter(p => p.facilityId === facility.guid);
            const facilityPredictorData = predictorData.filter(d => d.facilityId === facility.guid);
            const energyAnalysisItem = this.getLatestAnalysisItem(facility, facilityAnalysisItems, 'energy');
            const waterAnalysisItem = this.getLatestAnalysisItem(facility, facilityAnalysisItems, 'water');
            return new FacilityStatusCheck(
                facility,
                calanderizedMeters,
                facilityMeterData,
                facilityPredictors,
                facilityPredictorData,
                energyAnalysisItem,
                waterAnalysisItem,
                analysisSetupErrors,
                facilityMeters,
                facilityMeterGroups,
                outdatedDays
            );
        });
        this.setStatus();
    }

    private getLatestAnalysisItem(facility: IdbFacility, analysisItems: Array<IdbAnalysisItem>, category: 'energy' | 'water'): IdbAnalysisItem | undefined {
        const selectedId = category === 'energy' ? facility.selectedEnergyAnalysisId : facility.selectedWaterAnalysisId;
        if (selectedId) {
            return analysisItems.find(item => item.guid === selectedId);
        }
        const items = analysisItems.filter(item => item.facilityId === facility.guid && item.analysisCategory === category);
        return items.length > 0 ? _.maxBy(items, 'modifiedDate') : undefined;
    }

    private setAccountActions(account: IdbAccount, facilities: Array<IdbFacility>) {
        this.actions = [];
        if (account.name === 'New Account') {
            this.actions.push({
                label: 'Setup account settings',
                url: '/data-management/' + account.guid + '/account-setup',
                description: 'Set the account name, unit settings, location and organizational goals. This will help you manage your data effectively.',
                facilityId: undefined,
                type: 'account',
                trackGuid: account.guid + '_setup_account'
            });
        }
        if (facilities.length === 0) {
            this.actions.push({
                label: 'Upload data',
                url: '/data-management/' + account.guid + '/import-data',
                description: "For accounts with large amounts of facility data, upload data to the account. Use VERIFI's upload data features to get data into VERIFI via excel.",
                facilityId: undefined,
                type: 'account',
                trackGuid: account.guid + '_upload_data'
            });
            this.actions.push({
                label: 'Add data manually',
                url: '/data-management/' + account.guid + '/facilities',
                description: 'For smaller accounts. Manual data entry is possible. Create one or more facilities for this account manually.',
                facilityId: undefined,
                type: 'account',
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