import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getDateFromMeterData } from '@shared/dateHelperFunctions';

export interface Statistics {
  min: number;
  max: number;
  average: number;
  median: number;
  medianAbsDev: number;
  medianminus2_5MAD: number;
  medianplus2_5MAD: number;
  outliers: number;
}

export interface MeterDataQualityDuplicateMonth {
  readonly monthYear: string;
  readonly sortValue: number;
  readonly count: number;
}

export interface MeterDataQualityChartRow {
  readonly reading: IdbUtilityMeterData;
  readonly date: Date;
  readonly dateLabel: string;
  readonly sortValue: number;
  readonly consumptionValue: number | undefined;
  readonly costValue: number | undefined;
  readonly consumptionOutlier: boolean;
  readonly costOutlier: boolean;
}

export interface MeterDataQualityReport {
  readonly meter: IdbUtilityMeter;
  readonly meterData: readonly IdbUtilityMeterData[];
  readonly hasData: boolean;
  readonly showConsumption: boolean;
  readonly includeCosts: boolean;
  readonly unit: string;
  readonly energyStats: Statistics;
  readonly costStats: Statistics;
  readonly energyOutlierCount: number;
  readonly costOutlierCount: number;
  readonly duplicateMonths: readonly MeterDataQualityDuplicateMonth[];
  readonly chartRows: readonly MeterDataQualityChartRow[];
  readonly showAlert: boolean;
}

export function buildMeterDataQualityReport(
  meterData: readonly IdbUtilityMeterData[],
  selectedMeter: IdbUtilityMeter
): MeterDataQualityReport {
  const data = [...meterData];
  const { energyStats, costStats } = getStatistics(data, selectedMeter);
  const includeCosts = isMeterDataQualityCostIncluded(costStats);
  const duplicateMonths = getDuplicateMeterDataMonths(data);
  const showConsumption = shouldShowMeterDataQualityConsumption(selectedMeter);

  return {
    meter: selectedMeter,
    meterData: data,
    hasData: data.length > 0,
    showConsumption,
    includeCosts,
    unit: getUnitFromMeter(selectedMeter, data),
    energyStats,
    costStats,
    energyOutlierCount: energyStats.outliers,
    costOutlierCount: costStats.outliers,
    duplicateMonths,
    chartRows: buildMeterDataQualityChartRows(data, selectedMeter, energyStats, costStats),
    showAlert: (showConsumption && energyStats.outliers > 0)
      || (includeCosts && costStats.outliers > 0)
      || duplicateMonths.length > 0
  };
}

export function getStatistics(meterData: Array<IdbUtilityMeterData>, selectedMeter: IdbUtilityMeter): {
  energyStats: Statistics;
  costStats: Statistics;
} {
  const consumptionData = getConsumptionData(meterData, selectedMeter);
  const energyStats = calculateStatistics(consumptionData);
  const costData = meterData.map(data => data.totalCost);
  const costStats = calculateStatistics(costData);
  return { energyStats, costStats };
}

export function getConsumptionData(meterData: Array<IdbUtilityMeterData>, selectedMeter: IdbUtilityMeter): Array<number | undefined | null> {
  if (selectedMeter.source === 'Electricity') {
    return meterData.map(data => data.totalEnergyUse);
  }
  if (selectedMeter.scope === 5 || selectedMeter.scope === 6) {
    return meterData.map(data => data.totalVolume);
  }
  if (selectedMeter.scope === 2) {
    return meterData.map(data => data.totalEnergyUse);
  }
  const allEnergyInvalid = meterData.every(data =>
    data.totalEnergyUse === 0
    || data.totalEnergyUse === undefined
    || data.totalEnergyUse === null
  );
  return allEnergyInvalid
    ? meterData.map(data => data.totalVolume)
    : meterData.map(data => data.totalEnergyUse);
}

export function getUnitFromMeter(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): string {
  if (meter.source === 'Electricity') {
    return meter.energyUnit;
  }
  if (meter.scope === 5 || meter.scope === 6) {
    return meter.startingUnit;
  }
  if (meter.scope === 2) {
    return meter.energyUnit;
  }
  const allEnergyInvalid = meterData.every(data =>
    data.totalEnergyUse === 0
    || data.totalEnergyUse === undefined
    || data.totalEnergyUse === null
  );
  return allEnergyInvalid ? meter.startingUnit : meter.energyUnit;
}

export function calculateStatistics(data: Array<number | undefined | null>): Statistics {
  const numericData = data.filter(isFiniteQualityNumber);
  if (!numericData.length) {
    return {
      min: NaN,
      max: NaN,
      average: NaN,
      median: NaN,
      medianAbsDev: NaN,
      medianminus2_5MAD: NaN,
      medianplus2_5MAD: NaN,
      outliers: 0
    };
  }
  const min = Math.min(...numericData);
  const max = Math.max(...numericData);
  const average = numericData.reduce((sum, value) => sum + value, 0) / numericData.length;
  const median = calculateMedian(numericData);
  const medianAbsDev = calculateMAD(numericData, median);
  const medianminus2_5MAD = median - 5.0 * medianAbsDev;
  const medianplus2_5MAD = median + 5.0 * medianAbsDev;
  const outliers = calculateOutliers(numericData, median, medianAbsDev);

  return { min, max, average, median, medianAbsDev, medianminus2_5MAD, medianplus2_5MAD, outliers };
}

export function shouldShowMeterDataQualityConsumption(meter: IdbUtilityMeter): boolean {
  return !(meter.source === 'Electricity' && !meter.includeInEnergy);
}

export function isMeterDataQualityCostIncluded(costStats: Statistics): boolean {
  return Number.isFinite(costStats.average) && costStats.average !== 0;
}

export function getDuplicateMeterDataMonths(meterData: readonly IdbUtilityMeterData[]): MeterDataQualityDuplicateMonth[] {
  const monthCounts = new Map<string, { monthYear: string; sortValue: number; count: number }>();
  for (const reading of meterData) {
    const date = getDateFromMeterData(reading);
    const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = monthCounts.get(key);
    monthCounts.set(key, {
      monthYear,
      sortValue: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
      count: existing ? existing.count + 1 : 1
    });
  }
  return [...monthCounts.values()]
    .filter(month => month.count > 1)
    .sort((first, second) => first.sortValue - second.sortValue);
}

export function buildMeterDataQualityChartRows(
  meterData: readonly IdbUtilityMeterData[],
  selectedMeter: IdbUtilityMeter,
  energyStats: Statistics,
  costStats: Statistics
): MeterDataQualityChartRow[] {
  const sortedData = [...meterData].sort((first, second) =>
    getDateFromMeterData(first).getTime() - getDateFromMeterData(second).getTime()
  );
  const consumptionData = getConsumptionData(sortedData, selectedMeter);

  return sortedData.map((reading, index) => {
    const date = getDateFromMeterData(reading);
    const consumptionValue = consumptionData[index];
    const costValue = reading.totalCost;
    return {
      reading,
      date,
      dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      sortValue: date.getTime(),
      consumptionValue: isFiniteQualityNumber(consumptionValue) ? consumptionValue : undefined,
      costValue: isFiniteQualityNumber(costValue) ? costValue : undefined,
      consumptionOutlier: isOutlier(consumptionValue, energyStats),
      costOutlier: isOutlier(costValue, costStats)
    };
  });
}

function calculateMedian(data: number[]): number {
  const sortedData = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sortedData.length / 2);
  return sortedData.length % 2 === 0
    ? (sortedData[mid - 1] + sortedData[mid]) / 2
    : sortedData[mid];
}

function calculateMAD(data: number[], median: number): number {
  const absDeviations = data.map(value => Math.abs(value - median));
  return calculateMedian(absDeviations);
}

function calculateOutliers(data: number[], median: number, mad: number): number {
  if (!data.length) {
    return 0;
  }
  const lowerBound = median - 5.0 * mad;
  const upperBound = median + 5.0 * mad;
  return data.filter(value => value < lowerBound || value > upperBound).length;
}

function isOutlier(value: number | undefined | null, stats: Statistics): boolean {
  return isFiniteQualityNumber(value)
    && (value < stats.medianminus2_5MAD || value > stats.medianplus2_5MAD);
}

function isFiniteQualityNumber(value: number | undefined | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
