import { PredictorType, WeatherDataType } from "./predictor"

export interface IdbPredictorEntryDeprecated {
    //keys (id primary)
    id?: number,
    guid: string,
    facilityId: string,
    accountId: string,
    //data
    // name: string,
    // description: string,
    // unit: string,
    // amount: number,
    date: Date,
    predictors: Array<PredictorDataDeprecated>,
    checked?: boolean,
    dbDate?: Date
}


export interface PredictorDataDeprecated {
    name: string,
    amount: number,
    unit?: string,
    description?: string,
    id: string,
    importWizardName?: string,
    production?: boolean,
    productionInAnalysis?: boolean,
    regressionCoefficient?: number,
    predictorType: PredictorType,
    referencePredictorId?: string,
    conversionType?: string,
    convertFrom?: string,
    convertTo?: string,
    weatherDataType?: WeatherDataType,
    weatherStationId?: string,
    weatherStationName?: string,
    heatingBaseTemperature?: number,
    coolingBaseTemperature?: number,
    weatherDataWarning?: boolean,
    weatherOverride?: boolean
}