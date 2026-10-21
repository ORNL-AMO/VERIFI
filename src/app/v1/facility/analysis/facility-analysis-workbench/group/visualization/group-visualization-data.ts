import type { CalanderizedMeter } from '@data/models/calanderization';
import type { AnalysisCategory } from '@data/models/analysis';
import type { IdbFacility } from '@data/models/idbModels/facility';
import type { IdbPredictorData } from '@data/models/idbModels/predictorData';
import type { CorrelationSummary, GroupMonthlyPoint, VisualizationRange } from './group-visualization.models';

/** Calendar months are integer ordinals; no timezone or daylight-saving arithmetic. */
export function monthValue(year: number, zeroBasedMonth: number): number | undefined {
  return Number.isInteger(year) && year >= 1 && year <= 9999
    && Number.isInteger(zeroBasedMonth) && zeroBasedMonth >= 0 && zeroBasedMonth <= 11
    ? year * 12 + zeroBasedMonth : undefined;
}

export function monthInput(month: number): string {
  return `${Math.floor(month / 12).toString().padStart(4, '0')}-${(month % 12 + 1).toString().padStart(2, '0')}`;
}

export function parseMonth(value: string): number | undefined {
  if (!/^\d{4}-\d{2}$/.test(value)) return undefined;
  return monthValue(Number(value.slice(0, 4)), Number(value.slice(5)) - 1);
}

export function monthLabel(month: number): string {
  const date = new Date(0);
  date.setUTCFullYear(Math.floor(month / 12), month % 12, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function baselineStartMonth(baselineYear: number | undefined, facility: IdbFacility | undefined): number | undefined {
  if (baselineYear == null || !facility) return undefined;
  const fiscal = facility.fiscalYear === 'nonCalendarYear';
  return monthValue(baselineYear - (fiscal && facility.fiscalYearCalendarEnd ? 1 : 0), fiscal ? facility.fiscalYearMonth : 0);
}

export function defaultVisualizationRange(points: readonly GroupMonthlyPoint[], baselineStart?: number): VisualizationRange {
  const first = points[0]?.month;
  const last = points.at(-1)?.month;
  return { start: baselineStart == null ? first == null ? '' : monthInput(first) : monthInput(baselineStart),
    end: last == null ? '' : monthInput(last) };
}

export function validVisualizationRange(range: VisualizationRange): boolean {
  const start = parseMonth(range.start), end = parseMonth(range.end);
  return start != null && end != null && start <= end;
}

export function filterVisualizationPoints(points: readonly GroupMonthlyPoint[], range: VisualizationRange): readonly GroupMonthlyPoint[] {
  if (!validVisualizationRange(range)) return [];
  const start = parseMonth(range.start)!, end = parseMonth(range.end)!;
  return points.filter(point => point.month >= start && point.month <= end);
}

/** Inputs are already scoped/projected to the owning group and analysis units. */
export function buildGroupMonthlyPoints(
  meters: readonly CalanderizedMeter[], readings: readonly IdbPredictorData[],
  predictorGuids: ReadonlySet<string>, category: AnalysisCategory
): GroupMonthlyPoint[] {
  const meterMonths = meters.map(meter => {
    const months = new Map<number, number>();
    for (const row of meter.monthlyData) {
      const month = monthValue(row.year, row.monthNumValue);
      if (month == null) continue;
      const value = category === 'energy' ? row.energyUse : row.energyConsumption;
      months.set(month, (months.get(month) ?? 0) + value);
    }
    return { meter: meter.meter, months };
  });
  const months = meterMonths.flatMap(item => [...item.months.keys()]).sort((a, b) => a - b);
  if (!months.length) return [];
  const predictorMonths = new Map<number, Map<string, { total: number; count: number }>>();
  for (const reading of readings) {
    const month = monthValue(reading.year, reading.month - 1);
    if (month == null || !predictorGuids.has(reading.predictorId)) continue;
    const values = predictorMonths.get(month) ?? new Map();
    const prior = values.get(reading.predictorId);
    values.set(reading.predictorId, { total: (prior?.total ?? 0) + (Number.isFinite(reading.amount) ? reading.amount : NaN), count: (prior?.count ?? 0) + 1 });
    predictorMonths.set(month, values);
  }
  const points: GroupMonthlyPoint[] = [];
  for (let month = months[0]; month <= months.at(-1)!; month++) {
    let total = 0, present = 0, complete = true;
    for (const item of meterMonths) {
      const value = item.months.get(month);
      const retirement = item.meter.noLongerInUse
        ? monthValue(item.meter.noLongerInUseYear, item.meter.noLongerInUseMonth) : undefined;
      if (value == null) {
        if (retirement == null || month <= retirement) complete = false;
      } else if (!Number.isFinite(value)) {
        complete = false;
        total = NaN;
      } else {
        total += value;
        present++;
      }
    }
    const values = predictorMonths.get(month);
    points.push({ month, label: monthLabel(month), usage: present && Number.isFinite(total) ? total : null,
      complete: complete && present > 0,
      predictors: Object.fromEntries([...predictorGuids].map(guid => {
        const value = values?.get(guid)?.total;
        return [guid, value != null && Number.isFinite(value) ? value : null];
      })),
      duplicatePredictors: [...(values ?? [])].filter(([, value]) => value.count > 1).map(([guid]) => guid) });
  }
  return points;
}

/** Ordinary least squares with an intercept, over complete paired months only. */
export function summarizeCorrelation(points: readonly GroupMonthlyPoint[], predictorGuid: string): CorrelationSummary {
  const pairs = points.flatMap(point => {
    const x = point.predictors[predictorGuid], y = point.usage;
    return point.complete && x != null && y != null && Number.isFinite(x) && Number.isFinite(y)
      ? [{ x, y, label: point.label }] : [];
  });
  if (pairs.length < 3) return { pairs, unavailableReason: 'At least three complete paired months are needed for a linear fit and correlation.' };
  const meanX = pairs.reduce((sum, pair) => sum + pair.x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length;
  let xx = 0, yy = 0, xy = 0;
  for (const pair of pairs) {
    const x = pair.x - meanX, y = pair.y - meanY;
    xx += x * x; yy += y * y; xy += x * y;
  }
  if (xx === 0 || yy === 0) return { pairs, unavailableReason: 'Both predictor and group usage must vary to calculate a linear fit and correlation.' };
  const r = Math.max(-1, Math.min(1, xy / Math.sqrt(xx) / Math.sqrt(yy)));
  const slope = xy / xx, intercept = meanY - slope * meanX;
  if (![r, slope, intercept].every(Number.isFinite)) return { pairs, unavailableReason: 'The values exceed the supported range for correlation.' };
  return { pairs, r, rSquared: r * r, slope, intercept };
}
