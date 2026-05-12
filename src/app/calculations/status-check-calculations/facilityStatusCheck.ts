import { AnalysisGroup, JStatRegressionModel } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { IdbUtilityMeterGroup } from "src/app/models/idbModels/utilityMeterGroup";
import { AnalysisSetupErrors } from "src/app/models/validation";
import { AnalysisStatusCheck } from "./analysisStatusCheck";
import { MeterStatusCheck } from "./meterStatusCheck";
import { PredictorStatusCheck } from "./predictorStatusCheck";
import { STATUS_CHECK_OPTIONS, StatusCheckAction } from "./statusCheckModels";

export class FacilityStatusCheck {

    energyAnalysisStatusCheck: AnalysisStatusCheck;
    waterAnalysisStatusCheck: AnalysisStatusCheck;

    metersStatusChecks: Array<MeterStatusCheck>;
    metersStatus: STATUS_CHECK_OPTIONS;
    predictorsStatusChecks: Array<PredictorStatusCheck>;
    predictorsStatus: STATUS_CHECK_OPTIONS;

    facility: IdbFacility;
    status: STATUS_CHECK_OPTIONS;
    statusMessage: string;
    actions: Array<StatusCheckAction>;

    constructor(
        facility: IdbFacility,
        calanderizedMeters: Array<CalanderizedMeter>,
        utilityMeterData: Array<IdbUtilityMeterData>,
        predictors: Array<IdbPredictor>,
        predictorData: Array<IdbPredictorData>,
        energyAnalysisItem: IdbAnalysisItem,
        waterAnalysisItem: IdbAnalysisItem,
        analysisSetupErrors: Array<AnalysisSetupErrors>,
        meters: Array<IdbUtilityMeter> = [],
        meterGroups: Array<IdbUtilityMeterGroup> = [],
        outdatedDays: number = 60
    ) {
        this.facility = facility;
        let facilityCalanderizedMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(meter => meter.meter.facilityId === facility.guid);
        this.energyAnalysisStatusCheck = new AnalysisStatusCheck(energyAnalysisItem, facilityCalanderizedMeters, predictors, predictorData, analysisSetupErrors);
        this.waterAnalysisStatusCheck = new AnalysisStatusCheck(waterAnalysisItem, facilityCalanderizedMeters, predictors, predictorData, analysisSetupErrors);
        this.setMetersStatusChecks(meters, facilityCalanderizedMeters, utilityMeterData, outdatedDays);
        this.setMetersStatus();
        this.setPredictorsStatusChecks(predictors, predictorData, outdatedDays);
        this.setPredictorsStatus();
        this.setActions(facility, meters, meterGroups, predictors);
        this.setStatus();
    }

    get allActions(): Array<StatusCheckAction> {
        const actions: Array<StatusCheckAction> = [...this.actions];
        this.metersStatusChecks.forEach(check => actions.push(...check.actions));
        this.predictorsStatusChecks.forEach(check => actions.push(...check.actions));
        return actions;
    }

    private setMetersStatusChecks(meters: Array<IdbUtilityMeter>, calanderizedMeters: Array<CalanderizedMeter>, utilityMeterData: Array<IdbUtilityMeterData>, outdatedDays: number) {
        this.metersStatusChecks = meters.map(meter => {
            const calanderizedMeter = calanderizedMeters.find(cm => cm.meter.guid === meter.guid);
            const meterReadings = utilityMeterData.filter(data => data.meterId === meter.guid);
            return new MeterStatusCheck(meter, meterReadings, calanderizedMeter, outdatedDays);
        });
    }

    private setPredictorsStatusChecks(predictors: Array<IdbPredictor>, predictorData: Array<IdbPredictorData>, outdatedDays: number) {
        this.predictorsStatusChecks = predictors.map(predictor => {
            let predictorReadings = predictorData.filter(data => data.predictorId === predictor.guid);
            return new PredictorStatusCheck(predictor, predictorReadings, outdatedDays);
        });
    }

    private setMetersStatus() {
        let meterStatuses: Array<STATUS_CHECK_OPTIONS> = this.metersStatusChecks.map(check => check.status);
        if (meterStatuses.includes('error')) {
            this.metersStatus = 'error';
        } else if (meterStatuses.includes('warning')) {
            this.metersStatus = 'warning';
        } else {
            this.metersStatus = 'good';
        }
    }

    private setPredictorsStatus() {
        let predictorStatuses: Array<STATUS_CHECK_OPTIONS> = this.predictorsStatusChecks.map(check => check.status);
        if (predictorStatuses.includes('error')) {
            this.predictorsStatus = 'error';
        } else if (predictorStatuses.includes('warning')) {
            this.predictorsStatus = 'warning';
        } else {
            this.predictorsStatus = 'good';
        }
    }

    private setActions(facility: IdbFacility, meters: Array<IdbUtilityMeter>, meterGroups: Array<IdbUtilityMeterGroup>, predictors: Array<IdbPredictor>) {
        this.actions = [];
        const facilityBaseUrl = `/data-management/${facility.accountId}/facilities/${facility.guid}`;
        if (meters.length === 0) {
            this.actions.push({
                label: 'Add utility meters for ' + facility.name,
                url: facilityBaseUrl + '/meters',
                description: 'Add utility meters to the facility. Utility meters are used to track energy, water, and other resource usage.',
                facilityId: facility.guid,
                type: 'meter',
                trackGuid: facility.guid + '_add_meters'
            });
        } else if (meterGroups.length === 0) {
            this.actions.push({
                label: 'Add utility meter groups for ' + facility.name,
                url: facilityBaseUrl + '/meter-grouping',
                description: 'Add utility meter groups to the facility. Utility meter groups are used to group meters for analysis and reporting.',
                facilityId: facility.guid,
                type: 'meter',
                trackGuid: facility.guid + '_add_meter_groups'
            });
        }
        if (predictors.length === 0) {
            this.actions.push({
                label: 'Add predictors for ' + facility.name,
                url: facilityBaseUrl + '/predictors',
                description: 'Add predictors to the facility. Predictors are used to analyze and forecast resource usage based on various factors.',
                facilityId: facility.guid,
                type: 'predictor',
                trackGuid: facility.guid + '_add_predictors'
            });
        }
    }

    private setStatus() {
        let statuses: Array<STATUS_CHECK_OPTIONS> = [this.energyAnalysisStatusCheck.status, this.waterAnalysisStatusCheck.status, this.metersStatus, this.predictorsStatus];

        if (statuses.includes('error')) {
            this.status = 'error';
        } else if (statuses.includes('warning')) {
            this.status = 'warning';
        } else {
            this.status = 'good';
        }
    }
}