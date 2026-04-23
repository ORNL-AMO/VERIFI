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

export class FacilityStatusCheck {

    energyAnalysisStatusCheck: AnalysisStatusCheck;
    waterAnalysisStatusCheck: AnalysisStatusCheck;

    metersStatusChecks: Array<MeterStatusCheck>;
    predictorsStatusChecks: Array<AnalysisStatusCheck>;

    status: STATUS_CHECK_OPTIONS;
    //TODO: add messages for each status to display in the UI
    statusMessage: string;
    constructor(
        facility: IdbFacility,
        calanderizedMeters: Array<CalanderizedMeter>,
        predictors: Array<IdbPredictor>,
        predictorData: Array<IdbPredictorData>,
        energyAnalysisItem: IdbAnalysisItem,
        waterAnalysisItem: IdbAnalysisItem,
        analysisSetupErrors: Array<AnalysisSetupErrors>
    ) {
        this.energyAnalysisStatusCheck = new AnalysisStatusCheck(energyAnalysisItem, calanderizedMeters, predictors, predictorData, analysisSetupErrors);
        this.waterAnalysisStatusCheck = new AnalysisStatusCheck(waterAnalysisItem, calanderizedMeters, predictors, predictorData, analysisSetupErrors);
        this.status = this.determineStatus();
    }


    private determineStatus(): STATUS_CHECK_OPTIONS {
        let analysisStatuses: Array<STATUS_CHECK_OPTIONS> = [this.energyAnalysisStatusCheck.status, this.waterAnalysisStatusCheck.status];

        if (analysisStatuses.includes('error')) {
            return 'error';
        } else if (analysisStatuses.includes('warning')) {
            return 'warning';
        } else {
            return 'good';
        }
    }
}