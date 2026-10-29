import { WeatherDataType } from '@data/models/idbModels/predictor';

export type PredictorWeatherWorkflowStatus =
  | 'idle'
  | 'loading'
  | 'calculating'
  | 'preview-ready'
  | 'committing'
  | 'cancelled'
  | 'error';

export interface PredictorWeatherWorkflowState {
  readonly status: PredictorWeatherWorkflowStatus;
  readonly message: string;
  readonly error?: string;
}

export function defaultWeatherPredictorName(type: WeatherDataType, baseTemperature?: number): string {
  if (type === 'HDD') {
    return `HDD Generated${Number.isFinite(baseTemperature) ? ` (${baseTemperature}F)` : ''}`;
  }
  if (type === 'CDD') {
    return `CDD Generated${Number.isFinite(baseTemperature) ? ` (${baseTemperature}F)` : ''}`;
  }
  const names: Record<Exclude<WeatherDataType, 'HDD' | 'CDD'>, string> = {
    relativeHumidity: 'Relative Humidity',
    dryBulbTemp: 'Dry Bulb Temp',
    wetBulbTemp: 'Wet Bulb Temp',
    dewPointTemp: 'Dew Point Temp',
    precipitation: 'Precipitation'
  };
  return names[type];
}
