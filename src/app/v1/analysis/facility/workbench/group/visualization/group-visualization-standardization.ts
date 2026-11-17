import type { GroupMonthlyPoint, TimeSeriesDisplay, TimeSeriesScale, VisualizationPredictor } from './group-visualization.models';

/** Population z-scores across the full analysis period. Gaps never become zeroes. */
export { zScores } from '@domain/calculations/exploratory-standardization';
import { zScores } from '@domain/calculations/exploratory-standardization';

/** Each series is standardized independently; visibility and zoom do not change its reference period. */
export function buildTimeSeriesDisplay(points: readonly GroupMonthlyPoint[], predictors: readonly VisualizationPredictor[],
  scale: TimeSeriesScale): TimeSeriesDisplay {
  const unavailableSeries: string[] = [];
  const transform = (values: readonly (number | null)[], name: string): readonly (number | null)[] => {
    if (scale === 'raw') return values;
    const standardized = zScores(values);
    if (!standardized.available) unavailableSeries.push(name);
    return standardized.values;
  };
  const groupValues = transform(points.map(point => point.usage), 'Group usage');
  const predictorValues = Object.fromEntries(predictors.map(predictor => [predictor.guid,
    transform(points.map(point => point.predictors[predictor.guid] ?? null), predictor.name)]));
  return { scale, groupValues, predictorValues, unavailableSeries };
}
