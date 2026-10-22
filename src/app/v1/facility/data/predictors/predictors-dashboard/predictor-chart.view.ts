import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { predictorDataQualityUnit } from '@domain/calculations/data-quality/predictor-data-quality';
import { InventoryChartView } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.models';
import { InventorySeriesStyle, buildInventoryChartStyles } from '@app/v1/shared/charts/inventory-chart-styles';
import { validPredictorReadingDate } from '../models/predictor-reading.models';
import { PredictorInventoryEntry } from '../predictor-inventory/predictor-inventory.models';

/** One saved history per predictor; no aggregation, conversions or weather generation. */
export function buildPredictorCharts(entries: readonly PredictorInventoryEntry[], readings: readonly IdbPredictorData[],
  styles: ReadonlyMap<string, InventorySeriesStyle> = buildInventoryChartStyles(entries.map(entry => entry.guid))): InventoryChartView[] {
  const byPredictor = new Map<string, IdbPredictorData[]>();
  for (const reading of readings) {
    const own = byPredictor.get(reading.predictorId) ?? [];
    own.push(reading); byPredictor.set(reading.predictorId, own);
  }
  const names = new Map<string, number>();
  for (const entry of entries) names.set(entry.card.predictor.name, (names.get(entry.card.predictor.name) ?? 0) + 1);
  return [...entries].sort((a, b) => a.card.predictor.name.localeCompare(b.card.predictor.name) || a.guid.localeCompare(b.guid)).map(entry => {
    const saved = (byPredictor.get(entry.guid) ?? []).filter(reading => reading.facilityId === entry.facility.guid
      && reading.accountId === entry.card.predictor.accountId && validPredictorReadingDate(reading) && reading.year <= 9999)
      .sort((a, b) => monthIndex(a) - monthIndex(b) || a.guid.localeCompare(b.guid));
    const unit = predictorDataQualityUnit(entry.card.predictor);
    const title = (names.get(entry.card.predictor.name) ?? 0) > 1
      ? `${entry.card.predictor.name} (${entry.station?.stationName ?? entry.card.typeLabel}; ${entry.guid})` : entry.card.predictor.name;
    const rows: InventoryChartView['rows'][number][] = [];
    let last: number | undefined;
    for (const reading of saved) {
      const month = monthIndex(reading);
      if (last !== undefined) for (let missing = last + 1; missing < month; missing++) rows.push(chartRow(`gap:${missing}`, missing, entry.guid, null));
      rows.push(chartRow(reading.guid, month, entry.guid, Number.isFinite(reading.amount) ? reading.amount : null));
      last = month;
    }
    const first = saved[0], latest = saved.at(-1);
    return { id: entry.guid, title, unit,
      coverage: first && latest ? monthIndex(first) === monthIndex(latest) ? monthLabel(monthIndex(first)) : `${monthLabel(monthIndex(first))} – ${monthLabel(monthIndex(latest))}` : 'No monthly data',
      rows, metrics: saved.length ? [{ id: entry.guid, label: title, unit: unit || undefined,
        color: styles.get(entry.guid)?.color, lineStyle: styles.get(entry.guid)?.lineStyle }] : [] };
  });
}
function monthIndex(reading: IdbPredictorData): number { return reading.year * 12 + reading.month - 1; }
function monthLabel(month: number): string {
  return monthDate(month).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function monthDate(month: number): Date { const date = new Date(0); date.setUTCFullYear(Math.floor(month / 12), month % 12, 1); return date; }
function chartRow(key: string, month: number, guid: string, value: number | null): InventoryChartView['rows'][number] {
  return { periodKey: key, periodLabel: monthLabel(month), sortValue: monthDate(month).getTime(), values: { [guid]: value } };
}
