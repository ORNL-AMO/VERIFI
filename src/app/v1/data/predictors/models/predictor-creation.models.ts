import { WeatherDataType } from '@data/models/idbModels/predictor';

/** Selections handed to the new Weather setup workbench before its reviewed save. */
export interface WeatherPredictorSetupRequest {
  readonly facilityGuid: string;
  readonly weatherDataTypes: readonly WeatherDataType[];
}
