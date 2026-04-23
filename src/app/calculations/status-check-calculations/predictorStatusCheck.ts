import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { STATUS_CHECK_OPTIONS } from "./statusCheckModels";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";


export class PredictorStatusCheck {

    status: STATUS_CHECK_OPTIONS;

    constructor(predictor: IdbPredictor, predictorData: Array<IdbPredictorData>) {
        //TODO: flesh out predictor status check logic and messages
        this.status = 'good';
    }
}