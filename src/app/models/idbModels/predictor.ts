import { getNewIdbEntry, IdbEntry } from "./idbEntry";


export type PredictorType = 'Standard' | 'Conversion' | 'Math' | 'Weather';
export type WeatherDataType = 'HDD' | 'CDD' | 'relativeHumidity' | 'dryBulbTemp';

export interface IdbPredictor extends IdbEntry {
    facilityId: string,
    accountId: string,
    name: string,
    // amount: number,
    unit: string,
    description: string,
    importWizardName: string,
    production: boolean,
    productionInAnalysis: boolean,
    regressionCoefficient: number,
    predictorType: PredictorType,
    referencePredictorId: string,
    conversionType: string,
    convertFrom: string,
    convertTo: string,
    weatherDataType: WeatherDataType,
    weatherStationId: string,
    weatherStationName: string,
    heatingBaseTemperature: number,
    coolingBaseTemperature: number,
    weatherDataWarning: boolean,
    // weatherOverride: boolean
}

export function getNewIdbPredictor(accountId: string, facilityId: string): IdbPredictor {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: facilityId,
        accountId: accountId,
        name: 'Predictor',
        // amount: undefined,
        unit: undefined,
        description: undefined,
        importWizardName: undefined,
        production: undefined,
        productionInAnalysis: undefined,
        regressionCoefficient: undefined,
        predictorType: 'Standard',
        referencePredictorId: undefined,
        conversionType: undefined,
        convertFrom: undefined,
        convertTo: undefined,
        weatherDataType: 'HDD',
        weatherStationId: undefined,
        weatherStationName: undefined,
        heatingBaseTemperature: undefined,
        coolingBaseTemperature: undefined,
        weatherDataWarning: undefined,
        // weatherOverride: undefined
    }
}