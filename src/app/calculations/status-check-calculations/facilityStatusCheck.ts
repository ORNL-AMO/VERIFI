import { AnalysisGroup, JStatRegressionModel } from "src/app/models/analysis";
import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { AnalysisSetupErrors } from "src/app/models/validation";
import { AnalysisStatusCheck } from "./analysisStatusCheck";
import { STATUS_CHECK_OPTIONS } from "./statusCheckModels";
import { MeterStatusCheck } from "./meterStatusCheck";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { PredictorStatusCheck } from "./predictorStatusCheck";

export class FacilityStatusCheck {

    energyAnalysisStatusCheck: AnalysisStatusCheck;
    waterAnalysisStatusCheck: AnalysisStatusCheck;

    metersStatusChecks: Array<MeterStatusCheck>;
    metersStatus: STATUS_CHECK_OPTIONS;
    predictorsStatusChecks: Array<PredictorStatusCheck>;
    predictorsStatus: STATUS_CHECK_OPTIONS;

    status: STATUS_CHECK_OPTIONS;
    //TODO: add messages for each status to display in the UI
    statusMessage: string;
    constructor(
        facility: IdbFacility,
        calanderizedMeters: Array<CalanderizedMeter>,
        utilityMeterData: Array<IdbUtilityMeterData>,
        predictors: Array<IdbPredictor>,
        predictorData: Array<IdbPredictorData>,
        energyAnalysisItem: IdbAnalysisItem,
        waterAnalysisItem: IdbAnalysisItem,
        analysisSetupErrors: Array<AnalysisSetupErrors>
    ) {
        let facilityCalanderizedMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(meter => meter.meter.facilityId === facility.guid);
        this.energyAnalysisStatusCheck = new AnalysisStatusCheck(energyAnalysisItem, facilityCalanderizedMeters, predictors, predictorData, analysisSetupErrors);
        this.waterAnalysisStatusCheck = new AnalysisStatusCheck(waterAnalysisItem, facilityCalanderizedMeters, predictors, predictorData, analysisSetupErrors);
        this.setMetersStatusChecks(facilityCalanderizedMeters, utilityMeterData);
        this.setMetersStatus();
        this.setPredictorsStatusChecks(predictors, predictorData);
        this.setPredictorsStatus();
        this.setStatus();
    }

    private setMetersStatusChecks(calanderizedMeters: Array<CalanderizedMeter>, utilityMeterData: Array<IdbUtilityMeterData>) {
        this.metersStatusChecks = calanderizedMeters.map(calanderizedMeter => {
            let meterReadings = utilityMeterData.filter(data => data.meterId === calanderizedMeter.meter.guid);
            return new MeterStatusCheck(calanderizedMeter, meterReadings);
        });
    }

    private setPredictorsStatusChecks(predictors: Array<IdbPredictor>, predictorData: Array<IdbPredictorData>) {
        this.predictorsStatusChecks = predictors.map(predictor => {
            let predictorReadings = predictorData.filter(data => data.predictorId === predictor.guid);
            return new PredictorStatusCheck(predictor, predictorReadings);
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