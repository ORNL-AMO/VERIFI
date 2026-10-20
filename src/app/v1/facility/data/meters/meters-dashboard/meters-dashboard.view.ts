import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { MeterCardView } from '../models';
import { MeterResultsChartMetric, MeterResultsChartRow } from '@app/v1/shared/charts/metric-results-chart.models';
import { StatusEvaluationState } from '@app/v1/status/status.models';

export interface MeterInventoryEntry {
  readonly card: MeterCardView;
  readonly tone: 'success' | 'warning' | 'danger' | 'neutral';
  readonly statusLabel: string;
  readonly statusIcon: 'success' | 'warning' | 'danger' | 'loading' | 'info';
  readonly latest: number;
  readonly attentionRank: number;
  readonly noReadings: boolean;
  readonly missingGroup: boolean;
  readonly valid: boolean;
  readonly needsAttention: boolean;
  readonly searchText: string;
}
export interface MonthlyTrendView {
  readonly id: 'energy' | 'water' | 'cost';
  readonly title: string;
  readonly unit: string;
  readonly coverage: string;
  readonly metrics: readonly MeterResultsChartMetric[];
  readonly rows: readonly MeterResultsChartRow[];
}

export interface MeterSeriesStyle {
  readonly slot: number;
  readonly color: string;
  readonly lineStyle: 'solid' | readonly number[];
}

export function buildMeterChartStyles(guids: readonly string[], previous: ReadonlyMap<string, MeterSeriesStyle> = new Map()): ReadonlyMap<string, MeterSeriesStyle> {
  const current = new Set(guids);
  const styles = new Map([...previous].filter(([guid]) => current.has(guid)));
  const occupied = new Set([...styles.values()].map(style => style.slot));
  let slot = 0;
  for (const guid of [...current].sort()) {
    if (styles.has(guid)) continue;
    while (occupied.has(slot)) slot++;
    const pattern = Math.floor(slot / 12);
    const dash = pattern === 0 ? null : pattern === 1 ? [8, 4] : pattern === 2 ? [2, 4]
      : [10 + (pattern - 3) * 2, 4, 2, 4];
    styles.set(guid, { slot, color: `var(--v1-chart-series-${slot % 12 + 1})`, lineStyle: dash ?? 'solid' });
    occupied.add(slot);
  }
  return styles;
}

export function buildMeterInventory(cards: readonly MeterCardView[], readings: readonly IdbUtilityMeterData[],
  statusState: StatusEvaluationState): MeterInventoryEntry[] {
  const ready = statusState === 'ready';
  return cards.map(card => {
    const ownReadings = readings.filter(reading => reading.meterId === card.meter.guid);
    const noReadings = ownReadings.length === 0;
    const missingGroup = !card.group;
    const tone = ready ? card.statusTone === 'danger' ? 'danger' : card.statusTone === 'warning' ? 'warning' : 'success' : 'neutral';
    const statusLabel = !ready ? statusState === 'error' ? 'Checks unavailable' : 'Checks pending'
      : tone === 'danger' ? 'Has errors' : tone === 'warning' ? 'Has warnings' : 'All data valid';
    const statusIcon = tone === 'neutral' ? statusState === 'error' ? 'info' : 'loading' : tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'success';
    return {
      card, tone, statusLabel, statusIcon,
      latest: ownReadings.reduce((latest, reading) => Math.max(latest, reading.year * 12 + reading.month), 0),
      attentionRank: card.statusTone === 'danger' ? 0 : noReadings ? 1 : card.statusTone === 'warning' ? 2 : missingGroup ? 3 : !ready ? 4 : 5,
      noReadings, missingGroup, valid: ready && card.statusTone === 'success',
      needsAttention: noReadings || missingGroup || card.statusTone === 'danger' || card.statusTone === 'warning',
      searchText: [card.meter.name, card.meter.source, card.group?.name ?? 'ungrouped', statusLabel, card.statusLabel].join(' ').toLowerCase()
    };
  });
}

export function buildMonthlyTrends(meters: readonly CalanderizedMeter[], facility: IdbFacility | undefined,
  showWater: boolean, styles = buildMeterChartStyles(meters.map(item => item.meter.guid))): MonthlyTrendView[] {
  const months = new Map<number, Date>();
  for (const meter of meters) for (const month of meter.monthlyData) {
    const date = new Date(month.year, month.monthNumValue, 1);
    if (Number.isFinite(date.getTime())) months.set(month.year * 12 + month.monthNumValue, date);
  }
  const keys = [...months.keys()].sort((a, b) => a - b);
  const periods: number[] = [];
  if (keys.length) for (let key = keys[0]; key <= keys[keys.length - 1]; key++) periods.push(key);
  const duplicateNames = new Map<string, number>();
  for (const item of meters) duplicateNames.set(item.meter.name, (duplicateNames.get(item.meter.name) ?? 0) + 1);
  const chartKinds = ['energy', ...(showWater ? ['water' as const] : []), 'cost'] as const;
  const charts: MonthlyTrendView[] = chartKinds.map(id => {
    const eligible = meters.filter(item => id === 'energy' ? item.showEnergyUse
      : id === 'water' ? ['Water Intake', 'Water Discharge'].includes(item.meter.source) : true);
    const metrics = eligible.filter(item => item.monthlyData.length).map(item => ({
      id: item.meter.guid,
      label: (duplicateNames.get(item.meter.name) ?? 0) > 1 ? `${item.meter.name} (${item.meter.source}; ${item.meter.guid})` : item.meter.name,
      unit: id === 'energy' ? facility?.energyUnit : id === 'water' ? facility?.volumeLiquidUnit : undefined,
      currency: id === 'cost', color: styles.get(item.meter.guid)!.color, lineStyle: styles.get(item.meter.guid)!.lineStyle
    }));
    const values = new Map<number, Record<string, number | null>>();
    for (const item of eligible) for (const month of item.monthlyData) {
      const key = month.year * 12 + month.monthNumValue;
      const row = values.get(key) ?? {};
      const value = id === 'energy' ? month.energyUse : id === 'water' ? month.energyConsumption : month.energyCost;
      row[item.meter.guid] = Number.isFinite(value) ? value : null;
      values.set(key, row);
    }
    const rows = periods.map(key => {
      const date = new Date(Math.floor(key / 12), key % 12, 1);
      return { periodKey: `${date.getFullYear()}-${date.getMonth()}`, periodLabel: monthLabel(date), sortValue: date.getTime(), values: values.get(key) ?? {} };
    });
    return { id, title: id === 'energy' ? 'Energy' : id === 'water' ? 'Water' : 'Cost',
      unit: id === 'energy' ? facility?.energyUnit ?? '' : id === 'water' ? facility?.volumeLiquidUnit ?? '' : 'USD',
      coverage: dateCoverage(eligible.flatMap(item => item.monthlyData.map(month => month.date))), metrics, rows };
  });
  return charts.filter(chart => {
    if (chart.id !== 'cost') return true;
    const values = chart.rows.flatMap(row => Object.values(row.values))
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return !values.length || values.some(value => value !== 0);
  });
}

function monthLabel(date: Date): string { return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }
function dateCoverage(dates: readonly Date[]): string {
  const values = dates.map(date => new Date(date).getTime()).filter(Number.isFinite);
  if (!values.length) return 'No monthly data';
  const [min, max] = values.reduce(([min, max], value) => [Math.min(min, value), Math.max(max, value)], [Infinity, -Infinity]);
  const first = monthLabel(new Date(min));
  const last = monthLabel(new Date(max));
  return first === last ? first : `${first} – ${last}`;
}
