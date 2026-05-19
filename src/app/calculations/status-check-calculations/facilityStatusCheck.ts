import * as _ from 'lodash';
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { IdbUtilityMeterGroup } from "src/app/models/idbModels/utilityMeterGroup";
import { AnalysisSetupErrors, FacilityReportErrors } from "src/app/models/validation";
import { AnalysisStatusCheck } from "./analysisStatusCheck";
import { MeterStatusCheck } from "./meterStatusCheck";
import { PredictorStatusCheck } from "./predictorStatusCheck";
import { STATUS_CHECK_OPTIONS, StatusCheckAction } from "./statusCheckModels";
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { emptyFacilityReportErrors, getFacilityReportErrors } from './validation/facilityReportValidation';
import { AnalysisGroupStatusCheck } from './analysisGroupStatusCheck';

export class FacilityStatusCheck {

    analysisStatusChecks: Array<AnalysisStatusCheck>;
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
    hasPredictorWeatherWarnings: boolean;
    hasInvalidMeters: boolean;

    facilityLatestEntry: { month: number; year: number } | undefined;

    facilityReportErrors: Array<FacilityReportErrors>;

    constructor(
        facility: IdbFacility,
        calanderizedMeters: Array<CalanderizedMeter>,
        utilityMeterData: Array<IdbUtilityMeterData>,
        predictors: Array<IdbPredictor>,
        predictorData: Array<IdbPredictorData>,
        facilityAnalysisItems: Array<IdbAnalysisItem>,
        meters: Array<IdbUtilityMeter>,
        meterGroups: Array<IdbUtilityMeterGroup>,
        facilityReports: Array<IdbFacilityReport> = [],
    ) {
        const facilityMeters: Array<IdbUtilityMeter> = meters.filter(m => m.facilityId === facility.guid);
        const facilityPredictors: Array<IdbPredictor> = predictors.filter(p => p.facilityId === facility.guid);
        const facilityMeterGroups: Array<IdbUtilityMeterGroup> = meterGroups.filter(g => g.facilityId === facility.guid);
        const facilityPredictorData: Array<IdbPredictorData> = predictorData.filter(pd => pd.facilityId === facility.guid);
        const facilityCalanderizedMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(m => m.meter.facilityId === facility.guid);
        const facilityMeterData: Array<IdbUtilityMeterData> = utilityMeterData.filter(md => md.facilityId === facility.guid);
        const analysisItemsForFacility: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(ai => ai.facilityId === facility.guid);
        const facilityReportsForFacility: Array<IdbFacilityReport> = facilityReports.filter(fr => fr.facilityId === facility.guid);

        this.facility = facility;
        this.hasNoMeters = facilityMeters.length === 0;
        this.hasNoMeterData = facilityMeterData.length === 0;
        this.hasNoMeterGroups = !this.hasNoMeters && facilityMeterGroups.length === 0;
        this.hasNoPredictors = facilityPredictors.length === 0;
        this.facilityLatestEntry = this.computeFacilityLatestEntry(facilityMeterData);

        this.setMetersStatusChecks(facilityMeters, facilityCalanderizedMeters, facilityMeterData);
        this.setMetersStatus();
        this.hasInvalidMeters = this.metersStatusChecks.some(check => !check.isMeterValid);
        this.setHasNonCurrentMeters();
        this.setPredictorsStatusChecks(facilityPredictors, facilityPredictorData);
        this.hasPredictorWeatherWarnings = this.predictorsStatusChecks.some(check => check.hasWeatherDataWarning);
        this.setPredictorsStatus();
        this.setHasNonCurrentPredictors();
        this.setAnalysisStatusChecks(analysisItemsForFacility, facilityCalanderizedMeters, facilityPredictorData);
        this.setFacilityReportErrors(facilityReportsForFacility);
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
                description: 'Predictors are required to analyze resource usage.',
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

    private setAnalysisStatusChecks(analysisItems: Array<IdbAnalysisItem>, calanderizedMeters: Array<CalanderizedMeter>, predictorData: Array<IdbPredictorData>) {
        this.analysisStatusChecks = new Array<AnalysisStatusCheck>();
        analysisItems.forEach(item => {
            const itemStatusCheck = new AnalysisStatusCheck(item, this.metersStatusChecks, this.predictorsStatusChecks, calanderizedMeters, predictorData, this.facility);
            this.analysisStatusChecks.push(itemStatusCheck);
        });
        const energyAnalysisItem = this.getLatestAnalysisItem(analysisItems, 'energy');
        if (energyAnalysisItem) {
            this.energyAnalysisStatusCheck = this.analysisStatusChecks.find(check => check.analysisItem.guid === energyAnalysisItem.guid);
        }
        const waterAnalysisItem = this.getLatestAnalysisItem(analysisItems, 'water');
        if (waterAnalysisItem) {
            this.waterAnalysisStatusCheck = this.analysisStatusChecks.find(check => check.analysisItem.guid === waterAnalysisItem.guid);
        }
    }

    private getLatestAnalysisItem(analysisItems: Array<IdbAnalysisItem>, category: 'energy' | 'water'): IdbAnalysisItem | undefined {
        const selectedId = category === 'energy' ? this.facility.selectedEnergyAnalysisId : this.facility.selectedWaterAnalysisId;
        if (selectedId) {
            return analysisItems.find(item => item.guid === selectedId);
        }
        const items = analysisItems.filter(item => item.facilityId === this.facility.guid && item.analysisCategory === category);
        return items.length > 0 ? _.maxBy(items, 'modifiedDate') : undefined;
    }

    private setFacilityReportErrors(facilityReports: Array<IdbFacilityReport>) {
        this.facilityReportErrors = facilityReports.map(report => {
            const errors: FacilityReportErrors = getFacilityReportErrors(report, this.analysisStatusChecks.map(check => check.analysisSetupErrors));
            return errors;
        });
    }

    private setStatus() {
        let statuses: Array<STATUS_CHECK_OPTIONS> = [this.energyAnalysisStatusCheck?.status, this.waterAnalysisStatusCheck?.status, this.metersStatus, this.predictorsStatus];

        if (statuses.includes('error')) {
            this.status = 'error';
        } else if (statuses.includes('warning')) {
            this.status = 'warning';
        } else {
            this.status = 'good';
        }
    }

    getFacilityReportErrorsByReportId(reportId: string): FacilityReportErrors {
        const errors = this.facilityReportErrors.find(e => e.reportId === reportId);
        return errors ?? emptyFacilityReportErrors();
    }

    getAnalysisStatusById(analysisId: string): AnalysisStatusCheck | undefined {
        return this.analysisStatusChecks.find(asc => asc.analysisItem.guid === analysisId);
    }

    getGroupStatusChecksByGroupId(groupId: string, analysisId: string): AnalysisGroupStatusCheck | undefined {
        const analysisStatusCheck: AnalysisStatusCheck | undefined = this.getAnalysisStatusById(analysisId);
        return analysisStatusCheck?.getGroupStatusChecksByGroupId(groupId);
    }
}