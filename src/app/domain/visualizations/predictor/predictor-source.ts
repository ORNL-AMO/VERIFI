import { emptyMonthlySource } from '../visualization-monthly-combination';
import { civilMonthIndex, civilMonthRange } from '../visualization-periods';
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
export function isAllPredictors(source: PredictorVisualizationSource): boolean {
  return source.selection?.kind === 'rule' && source.selection.resource === 'predictor' && Object.keys(source.selection.filter).length === 0;
}
export function resolvePredictorSelection(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, source: PredictorVisualizationSource): readonly string[] {
  return isAllPredictors(source) ? predictorCatalog(snapshot, scope).map(predictor => predictor.guid)
    : source.selection?.kind === 'fixed' && source.selection.resource === 'predictor' ? source.selection.guids : [];
}
export function predictorHistoryRange(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, source: PredictorVisualizationSource): { start: string; end: string } | undefined {
  const selected = new Set(resolvePredictorSelection(snapshot, scope, source));
  const facilities = new Map(predictorCatalog(snapshot, scope).filter(record => selected.has(record.guid))
    .map(record => [record.guid, record.facilityId]));
  let first = Infinity, last = -Infinity;
  for (const reading of snapshot.predictorData) {
    if (reading.accountId !== snapshot.account.guid || !facilities.has(reading.predictorId)
      || facilities.get(reading.predictorId) !== reading.facilityId || !validPredictorMonth(reading)) continue;
    const month = indexOf(reading);
    first = Math.min(first, month); last = Math.max(last, month);
  }
  return Number.isFinite(first) ? { start: civilMonthRange(first).start, end: civilMonthRange(last).end } : undefined;
}
export function predictorContext(predictor: IdbPredictor): string {
  const stationName = predictor.weatherStationName?.trim(), stationId = predictor.weatherStationId?.trim();
  const station = stationName && stationId && stationName !== stationId ? `${stationName} (${stationId})` : stationName || stationId || 'Station not set';
  const base = predictor.weatherDataType === 'HDD'
    ? Number.isFinite(predictor.heatingBaseTemperature) ? `${predictor.heatingBaseTemperature}°F heating base` : 'Heating base not set'
    : predictor.weatherDataType === 'CDD'
      ? Number.isFinite(predictor.coolingBaseTemperature) ? `${predictor.coolingBaseTemperature}°F cooling base` : 'Cooling base not set'
      : '';
  return [isStandardPredictor(predictor) ? 'Standard' : predictor.predictorType,
    predictorUnit(predictor) || 'Unit not specified', predictor.noLongerInUse ? 'Retired' : '',
    ...(predictor.predictorType === 'Weather' ? [predictor.weatherDataType || 'Weather measure not set', station, base] : [])]
    .filter(Boolean).join(' · ');
}
export function validPredictorMonth(reading: Pick<IdbPredictorData, 'year' | 'month'>): boolean {
  return Number.isInteger(reading.year) && reading.year >= 1 && reading.year <= 9999
    && Number.isInteger(reading.month) && reading.month >= 1 && reading.month <= 12;
}
const indexOf = (reading: Pick<IdbPredictorData, 'year' | 'month'>) => reading.year * 12 + reading.month - 1;
function indexOwnedReadings(snapshot: AccountWorkspaceSnapshot, predictors: readonly IdbPredictor[]): ReadonlyMap<string, readonly IdbPredictorData[]> {
  const owners = new Map(predictors.map(predictor => [predictor.guid, predictor.facilityId]));
  const readings = new Map<string, IdbPredictorData[]>();
  for (const reading of snapshot.predictorData) {
    const facilityId = owners.get(reading.predictorId);
    if (facilityId === undefined || reading.accountId !== snapshot.account.guid || reading.facilityId !== facilityId) continue;
    const history = readings.get(reading.predictorId) ?? [];
    history.push(reading); readings.set(reading.predictorId, history);
  }
  return readings;
}
export function latestPredictorDate(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, source: PredictorVisualizationSource): string | undefined {
  const guids = new Set(resolvePredictorSelection(snapshot, scope, source));
  const selected = predictorCatalog(snapshot, scope).filter(predictor => guids.has(predictor.guid));
  if (selected.length !== guids.size) return undefined;
  const readings = indexOwnedReadings(snapshot, selected);
  let latest: number | undefined;
  for (const predictor of selected) {
    const grouped = groupReadings((readings.get(predictor.guid) ?? []).filter(validPredictorMonth));
    for (const [month, rows] of grouped) if (rows.length === 1 && Number.isFinite(rows[0].amount) && (latest === undefined || month > latest)) latest = month;
  }
  return latest === undefined ? undefined : civilMonthRange(latest).end;
}
function groupReadings(readings: readonly IdbPredictorData[]): Map<number, IdbPredictorData[]> {
  const grouped = new Map<number, IdbPredictorData[]>();
  for (const row of readings) { const month = indexOf(row), rows = grouped.get(month) ?? []; rows.push(row); grouped.set(month, rows); }
  return grouped;
}
export function predictorCapabilities(): VisualizationSourceCapabilities {
  return { kind: 'predictor', measures: ['value'], aggregations: ['none'], periods: ['all-history', 'fixed', 'rolling'], comparisons: ['none'],
    chartKinds: ['time-series'], shapes: ['time-series'], alignments: ['civil-month'], settings: ['unit'], controls: ['series', 'appearance', 'axes'], allowDateOverride: true, allowMultipleSources: true, allowMixedAxisUnits: true };
}
export function predictorChartSupport(source: PredictorVisualizationSource, chart: VisualizationChart): VisualizationChartSupport {
  const reasons: string[] = [];
  if (chart.kind !== 'time-series' || chart.interval !== 'monthly' || chart.stack !== 'none' || !['line', 'bar'].includes(chart.defaultTraceType))
    reasons.push('Predictors support monthly, unstacked line or bar charts.');
  if (source.aggregation !== 'none') reasons.push('Predictor aggregation is not supported.');
  if (!isAllPredictors(source) && (source.selection?.kind !== 'fixed' || source.selection.resource !== 'predictor' || !source.selection.guids.length))
    reasons.push('Select saved Standard or Weather predictors. Only exact selections and All Predictors are supported.');
  if (source.settings?.energyTreatment || source.settings?.unit?.kind === 'pinned') reasons.push('Predictors use their saved units without conversion.');
  return reasons.length ? { chart, state: 'unsupported', reasons } : { chart, state: 'supported' };
}
/** The provider checks completed months after retaining saved-history quality evidence. */
export function predictorPeriodIssue(request: Pick<VisualizationSourceRequest, 'period' | 'comparison'>, checkCompletedMonths = true): string | undefined {
  const { period, comparison } = request;
  if (comparison.kind !== 'none' || !['all-history', 'fixed', 'rolling'].includes(period.kind)
    || 'basis' in period && period.basis !== 'calendar') return 'Predictors support calendar month ranges without comparison.';
  if (checkCompletedMonths && period.kind === 'rolling' && period.includeIncomplete) return 'Choose completed months for the predictor rolling range.';
  return undefined;
}
function readingNotes(predictor: IdbPredictor, reading: IdbPredictorData): string[] {
  const notes: string[] = [];
  const savedNote = reading.notes?.trim();
  if (savedNote) notes.push(savedNote);
  if (reading.amount < 0) notes.push('Negative saved amount');
  if (reading.weatherDataWarning || predictor.weatherDataWarning) notes.push('Saved weather warning');
  if (reading.weatherDataChanged) notes.push('Saved weather data changed');
  if (reading.weatherOverride) notes.push('Manual weather override');
  if (predictor.noLongerInUse && validPredictorMonth(reading) && validPredictorMonth({ year: predictor.noLongerInUseYear, month: predictor.noLongerInUseMonth })
    && indexOf(reading) > predictor.noLongerInUseYear * 12 + predictor.noLongerInUseMonth - 1) notes.push('Saved reading after retirement');
  if (predictor.predictorType === 'Weather') notes.push(predictorContext(predictor));
  else if (!predictorUnit(predictor)) notes.push('Unit not specified');
  return notes;
}

function readingEvidence(record: IdbPredictor, reading: IdbPredictorData): string {
  const notes = readingNotes(record, reading);
  return `${reading.guid}: ${String(reading.amount)} (${reading.year}-${String(reading.month).padStart(2, '0')})${notes.length ? ` · ${notes.join(' · ')}` : ''}`;
}

function monthlyObservation(record: IdbPredictor, entries: readonly IdbPredictorData[], month: number): VisualizationObservation {
  if (entries.length > 1) {
    const evidence = [...entries].sort((a, b) => a.guid.localeCompare(b.guid)).map(r => {
      const notes = readingNotes(record, r);
      return `${r.guid}: ${String(r.amount)}${notes.length ? ` (${notes.join(', ')})` : ''}`;
    }).join('; ');
    return { state: 'excluded', value: null, reason: `Duplicate readings for ${civilMonthRange(month).start.slice(0, 7)} (${evidence}). No value chosen or combined.` };
  }
  if (!entries.length) return { state: 'missing', value: null, reason: 'No saved reading for this month.' };
  const reading = entries[0];
  if (!Number.isFinite(reading.amount)) return { state: 'excluded', value: null, reason: `Nonfinite saved amount: ${readingEvidence(record, reading)}.` };
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
  const periodIssue = predictorPeriodIssue(request, false);
  if (periodIssue) return unsupported(periodIssue);
  if (snapshot.account.guid !== identity.accountGuid) return unsupported('The predictors do not belong to the current account.');
  const guids = resolvePredictorSelection(snapshot, identity.scope, source);
  const owned = snapshot.predictors.filter(p => p.accountId === identity.accountGuid && identity.scope.facilityGuids.includes(p.facilityId)
    && snapshot.facilities.some(f => f.guid === p.facilityId && f.accountId === identity.accountGuid));
  const byGuid = new Map(owned.map(predictor => [predictor.guid, predictor]));
  const missing = guids.filter(guid => !byGuid.has(guid));
  if (missing.length) return { identity, state: 'missing-source', references: missing.map(id => ({ kind: 'predictor', id })), message: 'Repair the selected predictor references.' };
  const records = guids.map(guid => byGuid.get(guid)!);
  if (records.some(record => !supportedPredictor(record))) return unsupported('Math and Conversion predictors are placeholders and are not supported.');
  const omissions: { resourceGuid: string; label: string; issue: string; readings: string[] }[] = [];
  const omit = (record: IdbPredictor, issue: string, readings: readonly IdbPredictorData[]) => {
    let group = omissions.find(item => item.resourceGuid === record.guid && item.issue === issue);
    if (!group) { group = { resourceGuid: record.guid, label: record.name, issue, readings: [] }; omissions.push(group); }
    for (const reading of [...readings].sort((a, b) => a.guid.localeCompare(b.guid))) group.readings.push(readingEvidence(record, reading));
  };
  const omitExcluded = (record: IdbPredictor, readings: readonly IdbPredictorData[]) => {
    if (readings.length > 1) omit(record, 'Duplicate month', readings);
    else if (readings.length && !Number.isFinite(readings[0].amount)) omit(record, 'Nonfinite saved amount', readings);
  };
  const indexed = indexOwnedReadings(snapshot, records);
  const histories = records.map(record => {
    const readings = indexed.get(record.guid) ?? [], grouped = groupReadings(readings.filter(validPredictorMonth));
    const invalid = readings.filter(reading => !validPredictorMonth(reading));
    if (invalid.length) omit(record, 'Invalid saved month', invalid);
    const months = [...grouped.keys()].sort((a, b) => a - b);
    return { record, grouped, first: months[0], last: months.at(-1) };
  });
  const series = records.map(record => ({ id: predictorSeriesId(source.id, record.guid), sourceId: source.id, metric: 'value', resourceGuid: record.guid,
    label: record.name, unit: predictorUnit(record), dimension: 'predictor', additive: false }));
  const references = records.map(record => ({ kind: 'predictor' as const, id: record.guid, accountGuid: record.accountId, facilityGuid: record.facilityId }));
  const empty = (message: string): VisualizationSourceResolution => emptyMonthlySource(request, message, series, references,
    omissions.map(group => `${group.label} · ${group.issue}: ${group.readings.join('; ')}`));
  let earliest = Infinity, latest = -Infinity;
  for (const history of histories) if (history.first !== undefined) {
    earliest = Math.min(earliest, history.first); latest = Math.max(latest, history.last!);
  }
  if (!Number.isFinite(earliest) && !request.dateContext.monthlyRange) return empty('No usable saved predictor periods are available.');
  let start = request.dateContext.monthlyRange?.start ?? civilMonthRange(earliest).start, end = request.dateContext.monthlyRange?.end ?? civilMonthRange(latest).end;
  if (period.kind === 'fixed') { start = period.start; end = period.end; }
  if (period.kind === 'rolling') {
    const issue = predictorPeriodIssue(request);
    if (issue) return unsupported(issue);
    const anchor = period.anchor === 'latest-data' ? request.dateContext.latestDataDate : request.dateContext.calendarDate;
    if (!anchor) {
      for (const { record, grouped } of histories) for (const entries of grouped.values()) omitExcluded(record, entries);
      return empty('No eligible saved predictor observation is available for the rolling anchor.');
    }
    let last = civilMonthIndex(anchor);
    if (period.anchor === 'calendar') last--;
    const count = period.count * (period.unit === 'year' ? 12 : 1), first = last - count + 1;
    if (first < 12 || last > 119999 || !Number.isSafeInteger(count) || count < 1) return unsupported('Choose a rolling range within years 1–9999.');
    start = civilMonthRange(first).start; end = civilMonthRange(last).end;
  }
  if (request.dateContext.monthlyRange) ({ start, end } = request.dateContext.monthlyRange);
  const first = civilMonthIndex(start);
  const last = civilMonthIndex(end);
  if (last - first + 1 > 12000 || (last - first + 1) * Math.max(1, records.length) > 250000) return unsupported('Narrow the month range or predictor selection.');
  const rows: { periodKey: string; start: string; end: string; values: Record<string, VisualizationObservation> }[] = [];
  for (let month = first; month <= last; month++) {
    const range = civilMonthRange(month);
    if (range.start < start || range.end > end) continue;
    const values: Record<string, VisualizationObservation> = {};
    for (const history of histories) {
      const { record, grouped } = history;
      const observation: VisualizationObservation = history.first === undefined || month < history.first || month > history.last!
        ? { state: 'alignment-padding', value: null, reason: 'Outside this predictor’s saved monthly history.' }
        : monthlyObservation(record, grouped.get(month) ?? [], month);
      values[predictorSeriesId(source.id, record.guid)] = observation;
      if (observation.state === 'excluded') omitExcluded(record, grouped.get(month) ?? []);
    }
    rows.push({ periodKey: range.start.slice(0, 7), ...range, values });
  }
  if (!rows.length) return empty('No whole months are contained in the selected range.');
  const hasValues = rows.some(row => Object.values(row.values).some(value => value.state === 'observed'));
  if (!hasValues && !request.dateContext.monthlyRange) return empty(`No usable saved values in the selected month range (${start.slice(0, 7)} – ${end.slice(0, 7)}).`);
  return { identity, ...(hasValues ? { state: 'ready' as const } : { state: 'empty' as const, message: 'No usable saved predictor values in this range.', periods: [], reasons: omissions.map(group => `${group.label} · ${group.issue}: ${group.readings.join('; ')}`) }), resolved: {
    data: { kind: 'time-series', rows }, alignment: { kind: 'civil-month', key: 'YYYY-MM' },
    series, references,
    periods: [{ role: 'primary', start: rows[0].start, end: rows.at(-1)!.end, basis: 'calendar', interval: 'monthly' }],
    provenance: [...new Set(records.map(record => record.predictorType === 'Weather' ? 'weather' as const : 'predictor' as const))],
    quality: { partial: rows.some(row => Object.values(row.values).some(value => value.state !== 'observed')), warnings: [], omissions }
  } };
}
