import * as _ from 'lodash';
import { CalanderizedMeter } from "@data/models/calanderization";
import { IdbAccount } from "@data/models/idbModels/account";
import { IdbAnalysisItem } from "@data/models/idbModels/analysisItem";
import { IdbFacility } from "@data/models/idbModels/facility";
import { IdbPredictor } from "@data/models/idbModels/predictor";
import { IdbPredictorData } from "@data/models/idbModels/predictorData";
import { IdbUtilityMeter } from "@data/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "@data/models/idbModels/utilityMeterData";
import { IdbUtilityMeterGroup } from "@data/models/idbModels/utilityMeterGroup";
import { AnalysisSetupErrors, GroupAnalysisErrors } from "@data/models/validation";
import { FacilityStatusCheck } from "./facilityStatusCheck";
import { STATUS_CHECK_OPTIONS, StatusCheckAction } from "./statusCheckModels";
import { emptyGroupAnalysisErrors } from "@domain/calculations/status-check-calculations/validation/groupAnalysisValidation";
import { emptyAnalysisSetupErrors } from "@domain/calculations/status-check-calculations/validation/analysisValidation";
import { emptyAccountAnalysisSetupErrors } from "@domain/calculations/status-check-calculations/validation/accountAnalysisValidation";
import { IdbFacilityReport } from "@data/models/idbModels/facilityReport";
import { IdbAccountAnalysisItem } from "@data/models/idbModels/accountAnalysisItem";
import { IdbAccountReport } from "@data/models/idbModels/accountReport";
import { AccountAnalysisSetupErrors } from "@data/models/accountAnalysis";
import { AnalysisStatusCheck } from './analysisStatusCheck';
import { AnalysisGroupStatusCheck } from './analysisGroupStatusCheck';
import { AccountAnalysisStatusCheck } from './accountAnalysisStatusCheck';
import { AccountReportStatusCheck } from './accountReportStatusCheck';

export class AccountStatusCheck {

    facilityStatusChecks: Array<FacilityStatusCheck>;
    status: STATUS_CHECK_OPTIONS;
    actions: Array<StatusCheckAction>;

    accountReportStatusChecks: Array<AccountReportStatusCheck>;
    accountAnalysisStatusChecks: Array<AccountAnalysisStatusCheck>;
    energyAnalysisStatusCheck: AccountAnalysisStatusCheck;
    waterAnalysisStatusCheck: AccountAnalysisStatusCheck;

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
                facilityReports,
                account
            );
        });
        this.computeAccountAnalysisSetupErrors(account, accountAnalysisItems);
        this.computeAccountReportStatusChecks(account, accountReports);
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

    getAccountAnalysisStatusCheckById(analysisId: string): AccountAnalysisStatusCheck | undefined {
        return this.accountAnalysisStatusChecks.find(aasc => aasc.analysisItemId === analysisId);
    }

    getAccountAnalysisErrorsByAnalysisId(analysisId: string): AccountAnalysisSetupErrors {
        const errors = this.getAccountAnalysisStatusCheckById(analysisId)?.accountAnalysisSetupErrors;
        return errors ?? emptyAccountAnalysisSetupErrors();
    }

    getFacilityStatusCheckByFacilityId(facilityId: string): FacilityStatusCheck | undefined {
        return this.facilityStatusChecks.find(fc => fc.facility.guid === facilityId);
    }

    private computeAccountAnalysisSetupErrors(account: IdbAccount, accountAnalysisItems: Array<IdbAccountAnalysisItem>) {
        this.accountAnalysisStatusChecks = [];
        const accountAnalysisItemsForAccount: Array<IdbAccountAnalysisItem> = accountAnalysisItems.filter(accountAnalysisItem => accountAnalysisItem.accountId === account.guid);
        for (const item of accountAnalysisItemsForAccount) {
            const accountAnalysisStatusCheck = new AccountAnalysisStatusCheck(item, this.facilityStatusChecks, account);
            this.accountAnalysisStatusChecks.push(accountAnalysisStatusCheck);
        }
        const energyAnalysisItem = this.getLatestAnalysisItem(account, accountAnalysisItemsForAccount, 'energy');
        if (energyAnalysisItem) {
            this.energyAnalysisStatusCheck = this.accountAnalysisStatusChecks.find(check => check.analysisItemId === energyAnalysisItem.guid);
        }
        const waterAnalysisItem = this.getLatestAnalysisItem(account, accountAnalysisItemsForAccount, 'water');
        if (waterAnalysisItem) {
            this.waterAnalysisStatusCheck = this.accountAnalysisStatusChecks.find(check => check.analysisItemId === waterAnalysisItem.guid);
        }
    }

    private getLatestAnalysisItem(account: IdbAccount, accountAnalysisItems: Array<IdbAccountAnalysisItem>, category: 'energy' | 'water'): IdbAccountAnalysisItem | undefined {
        const selectedId = category === 'energy' ? account.selectedEnergyAnalysisId : account.selectedWaterAnalysisId;
        if (selectedId) {
            return accountAnalysisItems.find(item => item.guid === selectedId);
        }
        const items = accountAnalysisItems.filter(item => item.accountId === account.guid && item.analysisCategory === category);
        return items.length > 0 ? _.maxBy(items, 'modifiedDate') : undefined;
    }

    private computeAccountReportStatusChecks(account: IdbAccount, accountReports: Array<IdbAccountReport>) {
        this.accountReportStatusChecks = [];
        for (const report of accountReports.filter(accountReport => accountReport.accountId === account.guid)) {
            const accountReportStatusCheck: AccountReportStatusCheck = new AccountReportStatusCheck(report, this.accountAnalysisStatusChecks);
            this.accountReportStatusChecks.push(accountReportStatusCheck);
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
        } else if (allStatuses.includes('outdated')) {
            this.status = 'outdated';
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
