/**
 * Compatibility entry point for callers outside the v1 Predictor feature.
 * New feature code should import the responsibility-specific modules directly.
 */
export type {
  WeatherPredictorDefinition,
  WeatherPredictorGenerationDraft,
  WeatherPredictorGenerationPreview,
  WeatherStationMonthCalculationValue,
  WeatherStationSelectionPreview,
  WeatherStationSelectionPreviewPoint,
  WeatherStationSelectionPreviewSeries
} from './weather-generation.models';
export {
  buildWeatherGenerationPreview,
  buildWeatherStationMonthCalculation,
  buildWeatherStationSelectionPreview
} from './weather-generation.models';

export type {
  WeatherMaintenanceMode,
  WeatherMaintenancePreview,
  WeatherMaintenancePreviewRow,
  WeatherMaintenanceRequest,
  WeatherReadingChangeKind,
  WeatherSourceCheck,
  WeatherStationGroupDefinition,
  WeatherStationGroupDraft,
  WeatherStationGroupPreview
} from './weather-reconciliation.models';
export {
  buildWeatherMaintenancePreview,
  buildWeatherStationGroupPreview
} from './weather-reconciliation.models';

export type {
  PredictorWeatherWorkflowState,
  PredictorWeatherWorkflowStatus
} from './weather-presentation.models';
export { defaultWeatherPredictorName } from './weather-presentation.models';

export {
  formatWeatherMonth,
  validateWeatherMonthRange,
  weatherFutureMonthCount,
  weatherLastTwoYearsRange,
  weatherMonthKey,
  weatherRangeForReadings,
  weatherSourceRangeThroughPresent
} from './weather-range.models';
