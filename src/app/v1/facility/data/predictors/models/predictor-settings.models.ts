import { WeatherStation } from '@data/models/degreeDays';
import { PredictorType, WeatherDataType } from '@data/models/idbModels/predictor';

export type SupportedPredictorType = Extract<PredictorType, 'Standard' | 'Weather'>;
export type PredictorSettingsSaveState = 'idle' | 'saving' | 'saved' | 'error' | 'invalid';

export interface PredictorDraft {
  readonly name: string;
  readonly production: boolean;
  readonly predictorType: SupportedPredictorType;
  readonly unit?: string;
  readonly weatherDataType?: WeatherDataType;
  readonly weatherStation?: WeatherStation;
  readonly baseTemperature?: number;
}

export const WEATHER_DATA_TYPE_OPTIONS: ReadonlyArray<{ readonly value: WeatherDataType; readonly label: string }> = [
  { value: 'HDD', label: 'Heating degree days' },
  { value: 'CDD', label: 'Cooling degree days' },
  { value: 'relativeHumidity', label: 'Relative humidity' },
  { value: 'dryBulbTemp', label: 'Dry bulb temperature' },
  { value: 'wetBulbTemp', label: 'Wet bulb temperature' },
  { value: 'dewPointTemp', label: 'Dew point temperature' },
  { value: 'precipitation', label: 'Precipitation' }
];

export function isDegreeDayType(type: WeatherDataType | undefined): type is 'HDD' | 'CDD' {
  return type === 'HDD' || type === 'CDD';
}
