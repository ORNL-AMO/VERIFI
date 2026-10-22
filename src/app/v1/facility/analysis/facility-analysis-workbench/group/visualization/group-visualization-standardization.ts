import type { GroupMonthlyPoint, TimeSeriesDisplay, TimeSeriesScale, VisualizationPredictor } from './group-visualization.models';

/** Population z-scores across the full analysis period. Gaps never become zeroes. */
export function zScores(values: readonly (number | null)[]): { values: (number | null)[]; available: boolean } {
  const finite = values.filter((value): value is number => value != null && Number.isFinite(value));
  // Scaling first bounds intermediate arithmetic even for very large or tiny usage values.
  const magnitude = finite.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  let mean = 0, squaredDeviations = 0, count = 0;
  for (const value of finite) {
    const scaled = magnitude ? value / magnitude : 0;
    const delta = scaled - mean;
    mean += delta / ++count;
    squaredDeviations += delta * (scaled - mean);
  }
  const deviation = Math.sqrt(squaredDeviations / count);
  const available = count >= 2 && deviation > 0 && Number.isFinite(deviation);
  return { available, values: values.map(value => available && value != null && Number.isFinite(value)
    ? (value / magnitude - mean) / deviation : null) };
}

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
