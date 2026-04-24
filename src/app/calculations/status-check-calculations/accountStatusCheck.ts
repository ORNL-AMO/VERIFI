import { CalanderizedMeter } from "src/app/models/calanderization";
import { IdbAccountAnalysisItem } from "src/app/models/idbModels/accountAnalysisItem";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictor } from "src/app/models/idbModels/predictor";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";

export class AccountStatusCheck {

    constructor(
        facilities: Array<IdbFacility>,
        calanderizedMeters: Array<CalanderizedMeter>,
        predictors: Array<IdbPredictor>,
        predictorData: Array<IdbPredictorData>,
        energyAnalysisItem: IdbAccountAnalysisItem,
        waterAnalysisItem: IdbAccountAnalysisItem,
        facilityAnalysisItems: Array<IdbAnalysisItem>
    ) { }

    
}