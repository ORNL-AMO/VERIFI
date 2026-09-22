import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

export interface PredictorCardView {
  readonly predictor: IdbPredictor;
  readonly icon: IconName;
  readonly typeLabel: string;
  readonly classificationLabel: 'Production' | 'Other';
  readonly unitLabel: string;
  readonly readingCount: number;
  readonly firstReadingLabel: string;
  readonly latestReadingLabel: string;
}

export function buildPredictorCards(
  predictors: ReadonlyArray<IdbPredictor>,
  readings: ReadonlyArray<IdbPredictorData>
): ReadonlyArray<PredictorCardView> {
  return [...predictors]
    .sort((first, second) => (first.name || '').localeCompare(second.name || ''))
    .map(predictor => buildPredictorCard(predictor, readings.filter(reading => reading.predictorId === predictor.guid)));
}

export function buildPredictorCard(
  predictor: IdbPredictor,
  readings: ReadonlyArray<IdbPredictorData>
): PredictorCardView {
  const sortedReadings = [...readings].sort(comparePredictorReadings);
  return {
    predictor,
    icon: predictorIcon(predictor),
    typeLabel: predictor.predictorType || 'Standard',
    classificationLabel: predictor.production ? 'Production' : 'Other',
    unitLabel: predictor.unit || 'Not set',
    readingCount: sortedReadings.length,
    firstReadingLabel: formatPredictorReadingMonth(sortedReadings[0]),
    latestReadingLabel: formatPredictorReadingMonth(sortedReadings.at(-1))
  };
}

export function predictorIcon(predictor: IdbPredictor): IconName {
  if (predictor.predictorType === 'Weather') {
    switch (predictor.weatherDataType) {
      case 'HDD':
        return 'thermometerSnowflake';
      case 'CDD':
        return 'thermometerSun';
      case 'relativeHumidity':
        return 'humidity';
      case 'dryBulbTemp':
        return 'thermometerWarm';
      case 'wetBulbTemp':
        return 'rainDrop';
      case 'dewPointTemp':
        return 'droplet';
      case 'precipitation':
        return 'cloudRain';
      default:
        return 'predictor';
    }
  }
  return predictor.production ? 'package' : 'predictor';
}

export function formatPredictorReadingMonth(reading: IdbPredictorData | undefined): string {
  if (!reading
    || !Number.isInteger(reading.month)
    || reading.month < 1
    || reading.month > 12
    || !Number.isInteger(reading.year)) return 'No data';
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(reading.year, reading.month - 1, 1)));
}

function comparePredictorReadings(first: IdbPredictorData, second: IdbPredictorData): number {
  return first.year - second.year || first.month - second.month;
}
