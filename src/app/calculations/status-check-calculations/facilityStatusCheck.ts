import * as _ from 'lodash';
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

    hasNoMeters: boolean;
    hasNoMeterData: boolean;
    hasNoMeterGroups: boolean;
    hasNoPredictors: boolean;
    hasNonCurrentPredictors: boolean;
    hasNonCurrentMeters: boolean;

    facilityLatestEntry: { month: number; year: number } | undefined;

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
        meterGroups: Array<IdbUtilityMeterGroup> = []
    ) {
        const facilityMeters: Array<IdbUtilityMeter> = meters.filter(m => m.facilityId === facility.guid);
        const facilityPredictors: Array<IdbPredictor> = predictors.filter(p => p.facilityId === facility.guid);
        const facilityMeterGroups: Array<IdbUtilityMeterGroup> = meterGroups.filter(g => g.facilityId === facility.guid);
        const facilityPredictorData: Array<IdbPredictorData> = predictorData.filter(pd => pd.facilityId === facility.guid);
        const facilityCalanderizedMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(m => m.meter.facilityId === facility.guid);
        const facilityMeterData: Array<IdbUtilityMeterData> = utilityMeterData.filter(md => md.facilityId === facility.guid);

        this.facility = facility;
        this.hasNoMeters = facilityMeters.length === 0;
        this.hasNoMeterData = facilityMeterData.length === 0;
        this.hasNoMeterGroups = !this.hasNoMeters && facilityMeterGroups.length === 0;
        this.hasNoPredictors = facilityPredictors.length === 0;
        this.facilityLatestEntry = this.computeFacilityLatestEntry(facilityMeterData);
        
        this.energyAnalysisStatusCheck = new AnalysisStatusCheck(energyAnalysisItem, facilityCalanderizedMeters, facilityPredictors, facilityPredictorData, analysisSetupErrors);
        this.waterAnalysisStatusCheck = new AnalysisStatusCheck(waterAnalysisItem, facilityCalanderizedMeters, facilityPredictors, facilityPredictorData, analysisSetupErrors);
        this.setMetersStatusChecks(facilityMeters, facilityCalanderizedMeters, facilityMeterData);
        this.setMetersStatus();
        this.setHasNonCurrentMeters();
        this.setPredictorsStatusChecks(facilityPredictors, facilityPredictorData);
        this.setPredictorsStatus();
        this.setHasNonCurrentPredictors();
        this.setActions(facility, facilityMeters, facilityMeterGroups, facilityPredictors);
        this.setStatus();
    }

    get allActions(): Array<StatusCheckAction> {
        const actions: Array<StatusCheckAction> = [...this.actions];
        this.metersStatusChecks.forEach(check => actions.push(...check.actions));
        this.predictorsStatusChecks.forEach(check => actions.push(...check.actions));
        return actions;
    }

    private computeFacilityLatestEntry(utilityMeterData: Array<IdbUtilityMeterData>): { month: number; year: number } | undefined {
        if (!utilityMeterData || utilityMeterData.length === 0) return undefined;
        const latest = _.maxBy(utilityMeterData, d => d.year * 12 + d.month);
        return latest ? { month: latest.month, year: latest.year } : undefined;
    }

    private setMetersStatusChecks(meters: Array<IdbUtilityMeter>, calanderizedMeters: Array<CalanderizedMeter>, utilityMeterData: Array<IdbUtilityMeterData>) {
        this.metersStatusChecks = meters.map(meter => {
            const calanderizedMeter = calanderizedMeters.find(cm => cm.meter.guid === meter.guid);
            const meterReadings = utilityMeterData.filter(data => data.meterId === meter.guid);
            return new MeterStatusCheck(meter, meterReadings, calanderizedMeter, this.facilityLatestEntry);
        });
    }

    private setPredictorsStatusChecks(predictors: Array<IdbPredictor>, predictorData: Array<IdbPredictorData>) {
        this.predictorsStatusChecks = predictors.map(predictor => {
            const predictorReadings = predictorData.filter(data => data.predictorId === predictor.guid);
            return new PredictorStatusCheck(predictor, predictorReadings, this.facilityLatestEntry);
        });
    }

    private setMetersStatus() {
        if (this.hasNoMeters || this.metersStatusChecks.some(c => c.status === 'error')) {
            this.metersStatus = 'error';
        } else if (this.hasNoMeterGroups || this.metersStatusChecks.some(c => c.status === 'warning')) {
            this.metersStatus = 'warning';
        } else {
            this.metersStatus = 'good';
        }
    }

    private setPredictorsStatus() {
        if (this.hasNoPredictors || this.predictorsStatusChecks.some(c => c.status === 'error')) {
            this.predictorsStatus = 'error';
        } else if (this.predictorsStatusChecks.some(c => c.status === 'warning')) {
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
                description: 'Utility meters are required to track energy, water, and other resource usage.',
                facilityId: facility.guid,
                type: 'meter',
                status: 'error',
                trackGuid: facility.guid + '_add_meters'
            });
        } else if (meterGroups.length === 0) {
            this.actions.push({
                label: 'Add meter groups for ' + facility.name,
                url: facilityBaseUrl + '/meter-grouping',
                description: 'Meter groups are required for analysis and reporting.',
                facilityId: facility.guid,
                type: 'meter',
                status: 'error',
                trackGuid: facility.guid + '_add_meter_groups'
            });
        }
        if (predictors.length === 0) {
            this.actions.push({
                label: 'Add predictors for ' + facility.name,
                url: facilityBaseUrl + '/predictors',
                description: 'Predictors are required to analyze and forecast resource usage.',
                facilityId: facility.guid,
                type: 'predictor',
                status: 'error',
                trackGuid: facility.guid + '_add_predictors'
            });
        }
    }

    private setHasNonCurrentMeters() {
        this.hasNonCurrentMeters = this.metersStatusChecks.some(check => !check.isDataCurrent);
    }

    private setHasNonCurrentPredictors() {
        this.hasNonCurrentPredictors = this.predictorsStatusChecks.some(check => !check.isDataCurrent);
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