import { IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';

const WEATHER_TYPES: readonly WeatherDataType[] = [
  'HDD', 'CDD', 'relativeHumidity', 'dryBulbTemp', 'wetBulbTemp', 'dewPointTemp', 'precipitation'
];

export function getImportPredictorIssues(predictor: IdbPredictor): readonly string[] {
  const issues: string[] = [];
  const name = predictor.name?.trim() ?? '';
  if (!name) issues.push('Enter a predictor name.');
  else if (name.length > 100) issues.push('Use a predictor name of 100 characters or fewer.');
  if ((predictor.unit?.length ?? 0) > 100) issues.push('Use a unit of 100 characters or fewer.');

  if (predictor.predictorType !== 'Standard' && predictor.predictorType !== 'Weather') {
    issues.push('Only Standard and existing Weather predictors are supported in this import.');
  }
  if (predictor.predictorType === 'Weather') {
    if (!predictor.weatherStationId?.trim() || !predictor.weatherStationName?.trim()) {
      issues.push('The existing Weather predictor must have a weather station.');
    }
    if (!WEATHER_TYPES.includes(predictor.weatherDataType)) {
      issues.push('The existing Weather predictor must have a weather metric.');
    }
    if (predictor.weatherDataType === 'HDD' && !Number.isFinite(predictor.heatingBaseTemperature)) {
      issues.push('The Heating Degree Days predictor must have a heating base temperature.');
    }
    if (predictor.weatherDataType === 'CDD' && !Number.isFinite(predictor.coolingBaseTemperature)) {
      issues.push('The Cooling Degree Days predictor must have a cooling base temperature.');
    }
  }
  return issues;
}

export function isImportPredictorValid(predictor: IdbPredictor): boolean {
  return getImportPredictorIssues(predictor).length === 0;
}

export function isSelectableExistingImportPredictor(predictor: IdbPredictor): boolean {
  return predictor.predictorType === 'Standard'
    || (predictor.predictorType === 'Weather' && isImportPredictorValid(predictor));
}

export function applyImportedWeatherReadingSemantics(
  reading: IdbPredictorData,
  predictor: IdbPredictor
): IdbPredictorData {
  if (predictor.predictorType !== 'Weather') return reading;
  return {
    ...reading,
    weatherOverride: true,
    weatherDataWarning: false,
    weatherDataChanged: false
  };
}
