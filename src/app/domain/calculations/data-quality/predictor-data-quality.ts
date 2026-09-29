import { IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';

export interface PredictorDataQualityStatistics {
  readonly min: number;
  readonly max: number;
  readonly average: number;
  readonly median: number;
  readonly medianAbsDev: number;
  readonly lowerExpectedBound: number;
  readonly upperExpectedBound: number;
  readonly outliers: number;
}

export interface PredictorDataQualityMonthIssue {
  readonly key: string;
  readonly month: number;
  readonly year: number;
  readonly monthLabel: string;
  readonly sortValue: number;
  readonly count: number;
}

export interface PredictorDataQualityChartRow {
  readonly reading: IdbPredictorData;
  readonly date: Date;
  readonly dateLabel: string;
  readonly sortValue: number;
  readonly value: number;
  readonly outlier: boolean;
  readonly negative: boolean;
  readonly weatherWarning: boolean;
  readonly weatherChanged: boolean;
}

export interface PredictorDataQualityReport {
  readonly predictor: IdbPredictor;
  readonly readings: readonly IdbPredictorData[];
  readonly hasData: boolean;
  readonly hasUsableData: boolean;
  readonly unit: string;
  readonly statistics: PredictorDataQualityStatistics;
  readonly outlierCount: number;
  readonly outlierPeriods: readonly string[];
  readonly duplicateMonths: readonly PredictorDataQualityMonthIssue[];
  readonly missingMonths: readonly PredictorDataQualityMonthIssue[];
  readonly negativeMonths: readonly PredictorDataQualityMonthIssue[];
  readonly weatherWarningMonths: readonly PredictorDataQualityMonthIssue[];
  readonly weatherChangedMonths: readonly PredictorDataQualityMonthIssue[];
  readonly chartRows: readonly PredictorDataQualityChartRow[];
}

export function buildPredictorDataQualityReport(
  readings: readonly IdbPredictorData[],
  predictor: IdbPredictor
): PredictorDataQualityReport {
  const data = [...readings];
  const finiteReadings = data.filter(reading => Number.isFinite(reading.amount));
  const statistics = calculatePredictorDataQualityStatistics(finiteReadings.map(reading => reading.amount));
  const chartRows = buildPredictorDataQualityChartRows(finiteReadings, statistics);
  const outlierPeriods = [...new Set(finiteReadings
    .filter(reading => isPredictorDataQualityOutlier(reading.amount, statistics))
    .sort(compareReadings)
    .map(reading => isValidPeriod(reading) ? monthKey(reading.year, reading.month) : `invalid:${reading.guid}`))];

  return {
    predictor,
    readings: data,
    hasData: data.length > 0,
    hasUsableData: finiteReadings.length > 0,
    unit: predictorDataQualityUnit(predictor),
    statistics,
    outlierCount: statistics.outliers,
    outlierPeriods,
    duplicateMonths: duplicateMonths(data),
    missingMonths: missingMonths(data),
    negativeMonths: groupedMonths(data.filter(reading => Number.isFinite(reading.amount) && reading.amount < 0)),
    weatherWarningMonths: groupedMonths(data.filter(reading => !!reading.weatherDataWarning)),
    weatherChangedMonths: groupedMonths(data.filter(reading => !!reading.weatherDataChanged)),
    chartRows
  };
}

export function calculatePredictorDataQualityStatistics(values: readonly number[]): PredictorDataQualityStatistics {
  const data = values.filter(Number.isFinite);
  if (data.length === 0) {
    return emptyStatistics();
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const average = data.reduce((total, value) => total + value, 0) / data.length;
  const median = calculateMedian(data);
  const medianAbsDev = calculateMedian(data.map(value => Math.abs(value - median)));
  const lowerExpectedBound = median - 5 * medianAbsDev;
  const upperExpectedBound = median + 5 * medianAbsDev;
  const outliers = medianAbsDev === 0
    ? 0
    : data.filter(value => value < lowerExpectedBound || value > upperExpectedBound).length;

  return {
    min,
    max,
    average,
    median,
    medianAbsDev,
    lowerExpectedBound,
    upperExpectedBound,
    outliers
  };
}

export function predictorDataQualityUnit(predictor: IdbPredictor): string {
  const storedUnit = predictor.unit?.trim();
  if (storedUnit) return storedUnit;
  if (predictor.predictorType !== 'Weather') return '';

  const weatherUnits: Partial<Record<WeatherDataType, string>> = {
    HDD: 'days',
    CDD: 'days',
    relativeHumidity: '%',
    dryBulbTemp: '°F',
    wetBulbTemp: '°F',
    dewPointTemp: '°F',
    precipitation: 'in'
  };
  return predictor.weatherDataType ? weatherUnits[predictor.weatherDataType] ?? '' : '';
}

function buildPredictorDataQualityChartRows(
  readings: readonly IdbPredictorData[],
  statistics: PredictorDataQualityStatistics
): PredictorDataQualityChartRow[] {
  return readings
    .filter(isValidPeriod)
    .sort(compareReadings)
    .map(reading => {
      const date = new Date(Date.UTC(reading.year, reading.month - 1, 1));
      return {
        reading,
        date,
        dateLabel: formatMonth(reading.year, reading.month),
        sortValue: date.getTime(),
        value: reading.amount,
        outlier: isPredictorDataQualityOutlier(reading.amount, statistics),
        negative: reading.amount < 0,
        weatherWarning: !!reading.weatherDataWarning,
        weatherChanged: !!reading.weatherDataChanged
      };
    });
}

function isPredictorDataQualityOutlier(
  value: number,
  statistics: PredictorDataQualityStatistics
): boolean {
  return statistics.medianAbsDev > 0
    && (value < statistics.lowerExpectedBound || value > statistics.upperExpectedBound);
}

function duplicateMonths(readings: readonly IdbPredictorData[]): PredictorDataQualityMonthIssue[] {
  return groupedMonths(readings).filter(month => month.count > 1);
}

function missingMonths(readings: readonly IdbPredictorData[]): PredictorDataQualityMonthIssue[] {
  const present = new Set(readings.filter(isValidPeriod).map(reading => monthValue(reading.year, reading.month)));
  if (present.size < 2) return [];
  const first = Math.min(...present);
  const last = Math.max(...present);
  const missing: PredictorDataQualityMonthIssue[] = [];
  for (let value = first + 1; value < last; value++) {
    if (present.has(value)) continue;
    const { year, month } = periodFromMonthValue(value);
    missing.push(monthIssue(year, month, 0));
  }
  return missing;
}

function groupedMonths(readings: readonly IdbPredictorData[]): PredictorDataQualityMonthIssue[] {
  const counts = new Map<number, number>();
  readings.filter(isValidPeriod).forEach(reading => {
    const value = monthValue(reading.year, reading.month);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort(([first], [second]) => first - second)
    .map(([value, count]) => {
      const { year, month } = periodFromMonthValue(value);
      return monthIssue(year, month, count);
    });
}

function monthIssue(year: number, month: number, count: number): PredictorDataQualityMonthIssue {
  return {
    key: monthKey(year, month),
    month,
    year,
    monthLabel: formatMonth(year, month),
    sortValue: monthValue(year, month),
    count
  };
}

function calculateMedian(values: readonly number[]): number {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function emptyStatistics(): PredictorDataQualityStatistics {
  return {
    min: NaN,
    max: NaN,
    average: NaN,
    median: NaN,
    medianAbsDev: NaN,
    lowerExpectedBound: NaN,
    upperExpectedBound: NaN,
    outliers: 0
  };
}

function compareReadings(first: IdbPredictorData, second: IdbPredictorData): number {
  const firstPeriod = isValidPeriod(first) ? monthValue(first.year, first.month) : Number.POSITIVE_INFINITY;
  const secondPeriod = isValidPeriod(second) ? monthValue(second.year, second.month) : Number.POSITIVE_INFINITY;
  return firstPeriod - secondPeriod || first.guid.localeCompare(second.guid);
}

function isValidPeriod(reading: Pick<IdbPredictorData, 'month' | 'year'>): boolean {
  return Number.isInteger(reading.year)
    && reading.year > 0
    && Number.isInteger(reading.month)
    && reading.month >= 1
    && reading.month <= 12;
}

function monthValue(year: number, month: number): number {
  return year * 12 + month - 1;
}

function periodFromMonthValue(value: number): { year: number; month: number } {
  return { year: Math.floor(value / 12), month: value % 12 + 1 };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatMonth(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}
