import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { isStandardPredictor, type IdbPredictor } from '@data/models/idbModels/predictor';
import type { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { predictorDataQualityUnit } from '@domain/calculations/data-quality/predictor-data-quality';
import type { PredictorVisualizationSource, VisualizationChart, VisualizationScope } from '../visualization-definition';
import type { VisualizationChartSupport, VisualizationObservation, VisualizationSourceCapabilities,
  VisualizationSourceRequest, VisualizationSourceResolution } from '../visualization-source-provider';

export function supportedPredictor(predictor: IdbPredictor): boolean {
  return isStandardPredictor(predictor) || predictor.predictorType === 'Weather';
}
export function predictorUnit(predictor: IdbPredictor): string { return predictorDataQualityUnit(predictor); }
export function predictorSeriesId(sourceId: string, guid: string): string { return `${sourceId}:predictor:${guid}`; }
export function predictorCatalog(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope): readonly IdbPredictor[] {
  const facilities = new Set(snapshot.facilities.filter(f => f.accountId === snapshot.account.guid && scope.facilityGuids.includes(f.guid)).map(f => f.guid));
  return snapshot.predictors.filter(p => p.accountId === snapshot.account.guid && facilities.has(p.facilityId) && supportedPredictor(p))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '') || a.guid.localeCompare(b.guid));
}
export function predictorContext(predictor: IdbPredictor): string {
  return [isStandardPredictor(predictor) ? 'Standard' : predictor.predictorType,
    predictorUnit(predictor) || 'Unit not specified', predictor.noLongerInUse ? 'Retired' : '',
    ...(predictor.predictorType === 'Weather' ? [predictor.weatherDataType, predictor.weatherStationName || predictor.weatherStationId,
      predictor.weatherDataType === 'HDD' && Number.isFinite(predictor.heatingBaseTemperature) ? `${predictor.heatingBaseTemperature}°F heating base` : '',
      predictor.weatherDataType === 'CDD' && Number.isFinite(predictor.coolingBaseTemperature) ? `${predictor.coolingBaseTemperature}°F cooling base` : ''] : [])]
    .filter(Boolean).join(' · ');
}
export function validPredictorMonth(reading: Pick<IdbPredictorData, 'year' | 'month'>): boolean {
  return Number.isInteger(reading.year) && reading.year >= 1 && reading.year <= 9999
    && Number.isInteger(reading.month) && reading.month >= 1 && reading.month <= 12;
}
const indexOf = (reading: Pick<IdbPredictorData, 'year' | 'month'>) => reading.year * 12 + reading.month - 1;
export function predictorMonthRange(index: number): { start: string; end: string } {
  const year = Math.floor(index / 12), month = index % 12 + 1;
  const prefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  const date = new Date(0); date.setUTCFullYear(year, month, 0);
  return { start: `${prefix}-01`, end: `${prefix}-${String(date.getUTCDate()).padStart(2, '0')}` };
}
function ownedReadings(snapshot: AccountWorkspaceSnapshot, predictor: IdbPredictor): readonly IdbPredictorData[] {
  return snapshot.predictorData.filter(r => r.accountId === snapshot.account.guid && r.facilityId === predictor.facilityId && r.predictorId === predictor.guid);
}
export function latestPredictorDate(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, source: PredictorVisualizationSource): string | undefined {
  if (source.selection?.kind !== 'fixed' || source.selection.resource !== 'predictor') return undefined;
  const catalog = predictorCatalog(snapshot, scope), selected = source.selection.guids.map(guid => catalog.find(p => p.guid === guid));
  if (selected.some(p => !p)) return undefined;
  let latest: number | undefined;
  for (const predictor of selected) {
    const grouped = groupReadings(ownedReadings(snapshot, predictor!).filter(validPredictorMonth));
    for (const [month, rows] of grouped) if (rows.length === 1 && Number.isFinite(rows[0].amount) && (latest === undefined || month > latest)) latest = month;
  }
  return latest === undefined ? undefined : predictorMonthRange(latest).end;
}
function groupReadings(readings: readonly IdbPredictorData[]): Map<number, IdbPredictorData[]> {
  const grouped = new Map<number, IdbPredictorData[]>();
  for (const row of readings) { const month = indexOf(row), rows = grouped.get(month) ?? []; rows.push(row); grouped.set(month, rows); }
  return grouped;
}
export function predictorCapabilities(): VisualizationSourceCapabilities {
  return { kind: 'predictor', measures: ['value'], aggregations: ['none'], periods: ['all-history', 'fixed', 'rolling'], comparisons: ['none'],
    chartKinds: ['time-series'], shapes: ['time-series'], alignments: ['civil-month'], settings: ['unit'], controls: ['series', 'appearance', 'axes'], allowDateOverride: true, allowMultipleSources: false, allowMixedAxisUnits: true };
}
export function predictorChartSupport(source: PredictorVisualizationSource, chart: VisualizationChart): VisualizationChartSupport {
  const reasons: string[] = [];
  if (chart.kind !== 'time-series' || chart.interval !== 'monthly' || chart.stack !== 'none' || !['line', 'bar'].includes(chart.defaultTraceType))
    reasons.push('Predictors support monthly, unstacked line or bar charts.');
  if (source.aggregation !== 'none') reasons.push('Predictor aggregation is not supported.');
  if (source.selection?.kind !== 'fixed' || source.selection.resource !== 'predictor' || !source.selection.guids.length)
    reasons.push('Select saved Standard or Weather predictors. Live rules are not supported yet.');
  if (source.settings?.energyTreatment || source.settings?.unit?.kind === 'pinned') reasons.push('Predictors use their saved units without conversion.');
  return reasons.length ? { chart, state: 'unsupported', reasons } : { chart, state: 'supported' };
}
function readingNotes(predictor: IdbPredictor, reading: IdbPredictorData): string[] {
  const notes: string[] = [];
  if (reading.amount < 0) notes.push('Negative saved amount');
  if (reading.weatherDataWarning) notes.push('Saved weather warning');
  if (reading.weatherDataChanged) notes.push('Saved weather data changed');
  if (reading.weatherOverride) notes.push('Manual weather override');
  if (predictor.noLongerInUse && validPredictorMonth({ year: predictor.noLongerInUseYear, month: predictor.noLongerInUseMonth })
    && indexOf(reading) > predictor.noLongerInUseYear * 12 + predictor.noLongerInUseMonth - 1) notes.push('Saved reading after retirement');
  return notes;
}

function monthlyObservation(record: IdbPredictor, entries: readonly IdbPredictorData[], month: number): VisualizationObservation {
  if (entries.length > 1) {
    const evidence = [...entries].sort((a, b) => a.guid.localeCompare(b.guid)).map(r => {
      const notes = readingNotes(record, r);
      return `${r.guid}: ${String(r.amount)}${notes.length ? ` (${notes.join(', ')})` : ''}`;
    }).join('; ');
    return { state: 'excluded', value: null, reason: `Duplicate readings for ${predictorMonthRange(month).start.slice(0, 7)} (${evidence}). No value chosen or combined.` };
  }
  if (!entries.length) return { state: 'missing', value: null, reason: 'No saved reading for this month.' };
  const reading = entries[0];
  if (!Number.isFinite(reading.amount)) return { state: 'excluded', value: null, reason: `Reading ${reading.guid} has nonfinite saved amount ${String(reading.amount)}.` };
  const notes = readingNotes(record, reading);
  return { state: 'observed', value: reading.amount, provenance: record.predictorType === 'Weather' ? 'weather' : 'predictor', partial: false,
    ...(notes.length ? { notes } : {}) };
}

/** Separate saved histories on one shared monthly window; no aggregation or source mutation. */
export function resolvePredictor(snapshot: AccountWorkspaceSnapshot, request: VisualizationSourceRequest): VisualizationSourceResolution {
  const { identity, source, period } = request;
  const unsupported = (message: string): VisualizationSourceResolution => ({ identity, state: 'unsupported', message });
  if (source.kind !== 'predictor') return unsupported('Choose a predictor source.');
  const support = predictorChartSupport(source, request.chart);
  if (support.state === 'unsupported') return unsupported(support.reasons.join(' '));
  if (request.comparison.kind !== 'none' || !['all-history', 'fixed', 'rolling'].includes(period.kind)
    || 'basis' in period && period.basis !== 'calendar') return unsupported('Predictors support calendar month ranges without comparison.');
  if (snapshot.account.guid !== identity.accountGuid) return unsupported('The predictors do not belong to the current account.');
  const guids = source.selection?.kind === 'fixed' ? source.selection.guids : [];
  const owned = snapshot.predictors.filter(p => p.accountId === identity.accountGuid && identity.scope.facilityGuids.includes(p.facilityId)
    && snapshot.facilities.some(f => f.guid === p.facilityId && f.accountId === identity.accountGuid));
  const missing = guids.filter(guid => !owned.some(p => p.guid === guid));
  if (missing.length) return { identity, state: 'missing-source', references: missing.map(id => ({ kind: 'predictor', id })), message: 'Repair the selected predictor references.' };
  const records = guids.map(guid => owned.find(p => p.guid === guid)!);
  if (records.some(record => !supportedPredictor(record))) return unsupported('Math and Conversion predictors are placeholders and are not supported.');
  const warnings: string[] = [];
  const histories = records.map(record => {
    const readings = ownedReadings(snapshot, record), grouped = groupReadings(readings.filter(validPredictorMonth));
    for (const r of readings.filter(r => !validPredictorMonth(r))) warnings.push(`${record.name}: omitted reading ${r.guid}: invalid saved month ${r.year}-${r.month}, amount ${String(r.amount)}.`);
    if (record.predictorType === 'Weather') warnings.push(`Saved weather history: ${record.name} · ${predictorContext(record)}. Viewing does not retrieve or regenerate weather.`);
    if (record.weatherDataWarning) warnings.push(`${record.name}: saved weather warning.`);
    if (!predictorUnit(record)) warnings.push(`${record.name}: unit not specified. Values are shown as saved.`);
    const months = [...grouped.keys()].sort((a, b) => a - b);
    if (!months.length) warnings.push(`${record.name}: no usable saved monthly history.`);
    return { record, grouped, first: months[0], last: months.at(-1) };
  });
  const empty = (message: string): VisualizationSourceResolution => ({ identity, state: 'empty', periods: [], message, reasons: warnings });
  const months = histories.flatMap(history => history.first === undefined ? [] : [history.first, history.last!]);
  if (!months.length) return empty('No usable saved predictor periods are available.');
  let start = predictorMonthRange(Math.min(...months)).start, end = predictorMonthRange(Math.max(...months)).end;
  if (period.kind === 'fixed') { start = period.start; end = period.end; }
  if (period.kind === 'rolling') {
    if (period.includeIncomplete) return unsupported('Choose completed months for the predictor rolling range.');
    const anchor = period.anchor === 'latest-data' ? request.dateContext.latestDataDate : request.dateContext.calendarDate;
    if (!anchor) {
      for (const { record, grouped } of histories) for (const [month, entries] of grouped) {
        const observation = monthlyObservation(record, entries, month);
        if (observation.state !== 'observed') warnings.push(`${record.name}: ${observation.reason}`);
      }
      return empty('No eligible saved predictor observation is available for the rolling anchor.');
    }
    let last = Number(anchor.slice(0, 4)) * 12 + Number(anchor.slice(5, 7)) - 1;
    if (period.anchor === 'calendar') last--;
    const count = period.count * (period.unit === 'year' ? 12 : 1), first = last - count + 1;
    if (first < 12 || last > 119999 || !Number.isSafeInteger(count) || count < 1) return unsupported('Choose a rolling range within years 1–9999.');
    start = predictorMonthRange(first).start; end = predictorMonthRange(last).end;
  }
  const first = Number(start.slice(0, 4)) * 12 + Number(start.slice(5, 7)) - 1;
  const last = Number(end.slice(0, 4)) * 12 + Number(end.slice(5, 7)) - 1;
  const rows: { periodKey: string; start: string; end: string; values: Record<string, VisualizationObservation> }[] = [];
  for (let month = first; month <= last; month++) {
    const range = predictorMonthRange(month);
    if (range.start < start || range.end > end) continue;
    const values: Record<string, VisualizationObservation> = {};
    for (const history of histories) {
      const { record, grouped } = history;
      const observation: VisualizationObservation = history.first === undefined || month < history.first || month > history.last!
        ? { state: 'alignment-padding', value: null, reason: 'Outside this predictor’s saved monthly history.' }
        : monthlyObservation(record, grouped.get(month) ?? [], month);
      values[predictorSeriesId(source.id, record.guid)] = observation;
      if (observation.state === 'observed') observation.notes?.forEach(note => warnings.push(`${record.name} · ${range.start.slice(0, 7)}: ${note}.`));
      else if (observation.state !== 'alignment-padding') warnings.push(`${record.name} · ${range.start.slice(0, 7)}: ${observation.reason}`);
    }
    rows.push({ periodKey: range.start.slice(0, 7), ...range, values });
  }
  if (!rows.some(row => Object.values(row.values).some(value => value.state === 'observed')))
    return empty(`No usable saved values in the selected month range (${start.slice(0, 7)} – ${end.slice(0, 7)}).`);
  return { identity, state: 'ready', resolved: {
    data: { kind: 'time-series', rows }, alignment: { kind: 'civil-month', key: 'civil-month' },
    series: records.map(record => ({ id: predictorSeriesId(source.id, record.guid), sourceId: source.id, metric: 'value', resourceGuid: record.guid,
      label: record.name, unit: predictorUnit(record), dimension: 'predictor', additive: false })),
    periods: [{ role: 'primary', start: rows[0].start, end: rows.at(-1)!.end, basis: 'calendar', interval: 'monthly' }],
    references: records.map(record => ({ kind: 'predictor', id: record.guid, accountGuid: record.accountId, facilityGuid: record.facilityId })),
    provenance: [...new Set(records.map(record => record.predictorType === 'Weather' ? 'weather' as const : 'predictor' as const))],
    quality: { partial: rows.some(row => Object.values(row.values).some(value => value.state !== 'observed')), warnings }
  } };
}
