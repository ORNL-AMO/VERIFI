import { IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { StatusItem } from '@app/v1/status/status.models';

export type PredictorCardStatusTone = 'success' | 'warning' | 'danger' | 'info';
export type FacilityPredictorStatusFilter = 'all' | 'attention' | 'noReadings' | 'clear';
export type FacilityPredictorTypeFilter = 'all' | 'standard' | 'weather';
export type FacilityPredictorSort = 'attention' | 'predictorName' | 'latestReading';

export interface PredictorStatisticFactView {
  readonly id: 'latest' | 'same-month-last-year' | 'latest-twelve-month-average' | 'previous-twelve-month-average';
  readonly label: string;
  readonly valueLabel: string;
  readonly periodLabel?: string;
  readonly unavailable: boolean;
}

export interface PredictorStatisticsView {
  readonly facts: readonly PredictorStatisticFactView[];
  readonly unitLabel?: string;
}

export interface PredictorCardView {
  readonly predictor: IdbPredictor;
  readonly icon: IconName;
  readonly typeLabel: string;
  readonly classificationLabel: 'Production' | 'Other';
  readonly unitLabel: string;
  readonly readingCount: number;
  readonly firstReadingLabel: string;
  readonly latestReadingLabel: string;
  readonly latestReadingSortValue: number;
  readonly weatherStationLabel?: string;
  readonly weatherTypeLabel?: string;
  readonly baseTemperatureLabel?: string;
  readonly statusFindings: readonly StatusItem[];
  readonly statusLabel: string;
  readonly statusTone: PredictorCardStatusTone;
  readonly statusIcon: IconName;
  readonly statusActionSummaries: readonly string[];
  readonly statistics: PredictorStatisticsView;
  readonly searchText: string;
}

export function buildPredictorCards(
  predictors: ReadonlyArray<IdbPredictor>,
  readings: ReadonlyArray<IdbPredictorData>,
  statusFindings: readonly StatusItem[] = [],
  statusReady = true
): ReadonlyArray<PredictorCardView> {
  return [...predictors]
    .sort(comparePredictorNames)
    .map(predictor => buildPredictorCard(
      predictor,
      readings.filter(reading => reading.predictorId === predictor.guid),
      statusFindings.filter(finding => finding.entity.kind === 'predictor' && finding.entity.guid === predictor.guid),
      statusReady
    ));
}

export function buildPredictorCard(
  predictor: IdbPredictor,
  readings: ReadonlyArray<IdbPredictorData>,
  statusFindings: readonly StatusItem[] = [],
  statusReady = true
): PredictorCardView {
  const sortedReadings = [...readings].sort(comparePredictorReadings);
  const statusLabel = predictorStatusLabel(statusFindings, statusReady);
  const weatherTypeLabel = predictor.predictorType === 'Weather'
    ? weatherDataTypeLabel(predictor.weatherDataType)
    : undefined;
  const weatherStationLabel = predictor.predictorType === 'Weather'
    ? predictor.weatherStationName || predictor.weatherStationId || 'Not set'
    : undefined;
  const baseTemperatureLabel = predictor.predictorType === 'Weather'
    ? predictorBaseTemperatureLabel(predictor)
    : undefined;
  const classificationLabel = predictor.production ? 'Production' : 'Other';
  const unitLabel = predictor.unit || 'Not set';
  const statistics = buildPredictorStatistics(sortedReadings, predictor.unit);

  return {
    predictor,
    icon: predictorIcon(predictor),
    typeLabel: predictor.predictorType || 'Standard',
    classificationLabel,
    unitLabel,
    readingCount: sortedReadings.length,
    firstReadingLabel: formatPredictorReadingMonth(sortedReadings[0]),
    latestReadingLabel: formatPredictorReadingMonth(sortedReadings.at(-1)),
    latestReadingSortValue: sortedReadings.at(-1) ? predictorMonthIndex(sortedReadings.at(-1)!) : Number.NEGATIVE_INFINITY,
    weatherStationLabel,
    weatherTypeLabel,
    baseTemperatureLabel,
    statusFindings,
    statusLabel,
    statusTone: predictorStatusTone(statusFindings, statusReady),
    statusIcon: predictorStatusIcon(statusFindings, statusReady),
    statusActionSummaries: statusFindings.slice(0, 2).map(finding => finding.description),
    statistics,
    searchText: [
      predictor.name, predictor.unit, predictor.predictorType, classificationLabel,
      weatherStationLabel, weatherTypeLabel, baseTemperatureLabel, statusLabel,
      ...statusFindings.map(finding => `${finding.title} ${finding.description}`)
    ].filter(Boolean).join(' ').toLowerCase()
  };
}

export function buildPredictorStatistics(
  readings: readonly IdbPredictorData[],
  unit?: string
): PredictorStatisticsView {
  const validReadings = readings.filter(reading => isValidReadingPeriod(reading));
  const readingsByMonth = new Map<number, IdbPredictorData[]>();
  for (const reading of validReadings) {
    const monthIndex = predictorMonthIndex(reading);
    readingsByMonth.set(monthIndex, [...(readingsByMonth.get(monthIndex) ?? []), reading]);
  }
  const latestMonthIndex = readingsByMonth.size > 0 ? Math.max(...readingsByMonth.keys()) : undefined;
  const latestReading = latestMonthIndex === undefined ? undefined : uniqueFiniteReading(readingsByMonth.get(latestMonthIndex));
  const previousYearReading = latestMonthIndex === undefined
    ? undefined
    : uniqueFiniteReading(readingsByMonth.get(latestMonthIndex - 12));
  const latestAverage = latestMonthIndex === undefined
    ? undefined
    : averagePredictorWindow(readingsByMonth, latestMonthIndex - 11, latestMonthIndex);
  const previousAverage = latestMonthIndex === undefined
    ? undefined
    : averagePredictorWindow(readingsByMonth, latestMonthIndex - 23, latestMonthIndex - 12);

  return {
    unitLabel: unit || undefined,
    facts: [
      statisticFact('latest', 'Latest value', latestReading?.amount, latestMonthIndex),
      statisticFact('same-month-last-year', 'Same month last year', previousYearReading?.amount, latestMonthIndex === undefined ? undefined : latestMonthIndex - 12),
      statisticFact('latest-twelve-month-average', 'Latest 12-mo avg', latestAverage),
      statisticFact('previous-twelve-month-average', 'Previous 12-mo avg', previousAverage)
    ]
  };
}

export function predictorIcon(predictor: IdbPredictor): IconName {
  if (predictor.predictorType === 'Weather') {
    switch (predictor.weatherDataType) {
      case 'HDD': return 'thermometerSnowflake';
      case 'CDD': return 'thermometerSun';
      case 'relativeHumidity': return 'humidity';
      case 'dryBulbTemp': return 'thermometerWarm';
      case 'wetBulbTemp': return 'rainDrop';
      case 'dewPointTemp': return 'droplet';
      case 'precipitation': return 'cloudRain';
      default: return 'predictor';
    }
  }
  return predictor.production ? 'package' : 'predictor';
}

export function weatherDataTypeLabel(type: WeatherDataType | undefined): string {
  const labels: Record<WeatherDataType, string> = {
    HDD: 'Heating degree days', CDD: 'Cooling degree days', relativeHumidity: 'Relative humidity',
    dryBulbTemp: 'Dry bulb temperature', wetBulbTemp: 'Wet bulb temperature',
    dewPointTemp: 'Dew point temperature', precipitation: 'Precipitation'
  };
  return type ? labels[type] : 'Not set';
}

export function formatPredictorReadingMonth(reading: IdbPredictorData | undefined): string {
  if (!reading || !isValidReadingPeriod(reading)) return 'No data';
  return formatMonthIndex(predictorMonthIndex(reading));
}

function statisticFact(
  id: PredictorStatisticFactView['id'], label: string, value: number | undefined, monthIndex?: number
): PredictorStatisticFactView {
  return {
    id, label,
    valueLabel: value === undefined ? 'Not available' : formatPredictorNumber(value),
    periodLabel: monthIndex === undefined ? undefined : formatMonthIndex(monthIndex),
    unavailable: value === undefined
  };
}

function averagePredictorWindow(
  readingsByMonth: ReadonlyMap<number, readonly IdbPredictorData[]>, startMonthIndex: number, endMonthIndex: number
): number | undefined {
  let total = 0;
  for (let monthIndex = startMonthIndex; monthIndex <= endMonthIndex; monthIndex++) {
    const reading = uniqueFiniteReading(readingsByMonth.get(monthIndex));
    if (!reading) return undefined;
    total += reading.amount;
  }
  return total / 12;
}

function uniqueFiniteReading(readings: readonly IdbPredictorData[] | undefined): IdbPredictorData | undefined {
  return readings?.length === 1 && Number.isFinite(readings[0].amount) ? readings[0] : undefined;
}

function formatPredictorNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function predictorStatusLabel(findings: readonly StatusItem[], ready: boolean): string {
  if (!ready) return 'Checking';
  if (findings.some(finding => finding.severity === 'error')) return 'Action needed';
  if (findings.some(finding => finding.severity === 'warning')) return 'Needs review';
  return 'Valid';
}

function predictorStatusTone(findings: readonly StatusItem[], ready: boolean): PredictorCardStatusTone {
  if (!ready) return 'info';
  if (findings.some(finding => finding.severity === 'error')) return 'danger';
  if (findings.some(finding => finding.severity === 'warning')) return 'warning';
  return 'success';
}

function predictorStatusIcon(findings: readonly StatusItem[], ready: boolean): IconName {
  if (!ready) return 'loading';
  if (findings.some(finding => finding.severity === 'error')) return 'danger';
  if (findings.some(finding => finding.severity === 'warning')) return 'warning';
  return 'success';
}

function predictorBaseTemperatureLabel(predictor: IdbPredictor): string | undefined {
  if (predictor.weatherDataType === 'HDD') {
    return Number.isFinite(predictor.heatingBaseTemperature) ? `${predictor.heatingBaseTemperature}°F heating base` : 'Heating base not set';
  }
  if (predictor.weatherDataType === 'CDD') {
    return Number.isFinite(predictor.coolingBaseTemperature) ? `${predictor.coolingBaseTemperature}°F cooling base` : 'Cooling base not set';
  }
  return undefined;
}

function comparePredictorNames(first: IdbPredictor, second: IdbPredictor): number {
  return (first.name || '').localeCompare(second.name || '') || first.guid.localeCompare(second.guid);
}

function comparePredictorReadings(first: IdbPredictorData, second: IdbPredictorData): number {
  return predictorMonthIndex(first) - predictorMonthIndex(second) || first.guid.localeCompare(second.guid);
}

function predictorMonthIndex(reading: Pick<IdbPredictorData, 'year' | 'month'>): number {
  return reading.year * 12 + reading.month - 1;
}

function isValidReadingPeriod(reading: Pick<IdbPredictorData, 'year' | 'month'>): boolean {
  return Number.isInteger(reading.month) && reading.month >= 1 && reading.month <= 12 && Number.isInteger(reading.year);
}

function formatMonthIndex(monthIndex: number): string {
  const year = Math.floor(monthIndex / 12);
  const month = monthIndex % 12;
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month, 1)));
}
