import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import type { SubregionEmissions } from '@data/models/eGridEmissions';
import { buildCalendarizationSummaries } from '@domain/calculations/calanderization/calendarizationExample';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { checkShowSiteToSource } from '@shared/sharedHelperFunctions';
import type { UtilityVisualizationSource } from '../visualization-definition';
import type { ResolvedVisualizationPeriod, VisualizationData, VisualizationObservation, VisualizationSourceRequest, VisualizationSourceResolution } from '../visualization-source-provider';
import { utilityChartSupport } from './utility-capabilities';
import { discoverUtilitySeries, utilityMeterEligible } from './utility-catalog';
import { civilDate, fiscalRange, fiscalYear, monthRange, overlaps, parseCivil, resolveUtilityRanges, validCivil } from './utility-periods';
import { aggregateUtilityObservations, calendarizedObservation, readingCivil, unavailableObservation, utilityInputField, utilityInputUnitError } from './utility-quality';
import { resolveUtilitySelection, utilityBuckets, utilityOwner, utilitySeriesId } from './utility-selection';
import { utilityEmissionsInputError } from './native/emissions-inputs';

type TimeSeriesRow = Extract<VisualizationData, { kind: 'time-series' }>['rows'][number];
interface MeterProjection {
  readonly meter: IdbUtilityMeter;
  readonly observations: ReadonlyMap<string, VisualizationObservation>;
  readonly actualKeys: readonly string[];
}

/** Runtime attestation from the authoritative projection, independent of display-only meter flags. */
export interface UtilityProjectionEvidence {
  readonly includeEmissions: boolean;
  /** The catalog actually used for these canonical values, not a replacement catalog attached afterward. */
  readonly emissionsRates?: readonly SubregionEmissions[];
}

/** Project authoritative monthly values; input meters have already been converted by the shared calendarization boundary. */
export function resolveCalendarizedUtility(snapshot: AccountWorkspaceSnapshot, request: VisualizationSourceRequest,
  meters: readonly CalanderizedMeter[], projectionEvidence?: UtilityProjectionEvidence): VisualizationSourceResolution {
  const identity = request.identity;
  const unsupported = (message: string): VisualizationSourceResolution => ({ identity, state: 'unsupported', message });
  if (snapshot.account.guid !== identity.accountGuid || request.source.kind !== 'utility' || request.source.id !== identity.sourceId) return unsupported('Resolve utility data in its owning account and source identity.');
  const source = request.source;
  const support = utilityChartSupport(source, request.chart);
  if (source.dataMode !== 'calendarized' || support.state !== 'supported') return unsupported(support.state === 'unsupported' ? support.reasons.join(' ') : 'Choose calendarized data.');
  if (request.chart.kind !== 'time-series' || request.chart.interval === 'native') return unsupported('Choose Monthly or Yearly for calendarized utility data.');
  if (!source.selection || source.selection.kind === 'fixed' && !source.selection.guids.length) return unsupported('Select meters or meter groups before previewing.');
  const selection = resolveUtilitySelection(snapshot, identity.scope, source);
  if (selection.missing.length) return { identity, state: 'missing-source', references: selection.missing, message: 'Repair the saved utility selection before previewing.' };
  const owner = utilityOwner(snapshot, identity.scope);
  if (!owner) return unsupported('The owner fiscal and unit settings are unavailable.');
  const eligible = selection.meters.filter(meter => utilityMeterEligible(meter, source));
  if (!eligible.length) return { identity, state: 'empty', periods: [], message: 'No selected meters expose this utility measure.' };
  const buckets = utilityBuckets(snapshot, source, eligible);
  const metadata = discoverUtilitySeries(snapshot, identity.scope, source);
  if (metadata.length !== buckets.length) return unsupported('Selected totals have incompatible or unavailable units. Choose compatible meters, a common supported unit, or separate meter series.');
  if (source.measure === 'consumption' && buckets.some(bucket => new Set(bucket.meters.map(meter => meter.source)).size > 1))
    return unsupported('A consumption total cannot combine different utility meanings. Group by meter or utility source.');
  if (meters.some((item, index) => meters.findIndex(candidate => candidate.meter.guid === item.meter.guid) !== index)) return unsupported('Duplicate canonical meter results prevent a safe utility projection.');
  const warnings = new Set<string>();
  for (const meter of selection.meters.filter(meter => !utilityMeterEligible(meter, source))) warnings.add(`${meter.name} (${meter.guid}) is excluded because this measure does not apply to its utility source.`);
  const diagnostics = new Map<string, { label: string; reason: string; periods: Set<string> }>();
  const record = (meter: IdbUtilityMeter, key: string, reason: string) => {
    const id = `${meter.guid}:${reason}`;
    const diagnostic = diagnostics.get(id) ?? { label: `${meter.name} (${meter.guid})`, reason, periods: new Set<string>() };
    diagnostic.periods.add(key); diagnostics.set(id, diagnostic);
  };
  try {
    const historyKeys = eligible.flatMap(meter => {
      const canonical = meters.find(item => item.meter.guid === meter.guid);
      return canonical?.monthlyData.length ? canonical.monthlyData.map(month => `${month.year}-${String(month.monthNumValue + 1).padStart(2, '0')}`)
        : snapshot.meterData.filter(reading => reading.meterId === meter.guid && validCivil(readingCivil(reading))).map(reading => readingCivil(reading).slice(0, 7));
    }).sort();
    if (historyKeys.some(key => !validCivil(`${key}-01`))) return unsupported('Canonical utility results contain an invalid period.');
    if (!historyKeys.length && request.period.kind === 'all-history') return { identity, state: 'empty', periods: [], message: 'No saved utility history is available.' };
    const history = historyKeys.length ? { start: `${historyKeys[0]}-01`, end: monthRange(Number(historyKeys[historyKeys.length - 1].slice(0, 4)), Number(historyKeys[historyKeys.length - 1].slice(5)) - 1).end } : undefined;
    let ranges = resolveUtilityRanges(request.period, request.comparison, owner, request.dateContext, history);
    if (request.chart.interval === 'yearly' && request.period.kind === 'all-history') {
      const basis = owner.fiscalYear === 'nonCalendarYear' ? 'fiscal' : 'calendar';
      if (request.comparison.kind === 'previous-year' && request.comparison.basis !== basis) return unsupported('Choose a comparison year with the same calendar or fiscal basis as the yearly source.');
      ranges = ranges.map(range => ({ ...range, basis }));
    }
    if (request.chart.interval === 'yearly' && new Set(ranges.map(range => range.basis)).size > 1) return unsupported('Yearly comparisons require matching calendar or fiscal interval meaning.');
    const months: { key: string; year: number; month: number; start: string; end: string; role: 'primary' | 'comparison'; basis: 'calendar' | 'fiscal' }[] = [];
    for (const range of ranges) {
      let start = range.start, end = range.end;
      if (request.chart.interval === 'yearly') {
        const calendar = range.basis === 'fiscal' ? owner : { fiscalYear: 'calendarYear' as const, fiscalYearMonth: 0, fiscalYearCalendarEnd: true };
        start = fiscalRange(fiscalYear(range.start, calendar), calendar).start;
        end = fiscalRange(fiscalYear(range.end, calendar), calendar).end;
      }
      const first = parseCivil(start), last = parseCivil(end);
      const count = (last.getFullYear() - first.getFullYear()) * 12 + last.getMonth() - first.getMonth() + 1;
      if (count > 12000 || months.length + count > 12000 || (months.length + count) * eligible.length > 250000) return unsupported('This utility projection is too large. Narrow the date interval or meter selection.');
      for (let index = 0; index < count; index++) {
        const date = new Date(first.getFullYear(), first.getMonth() + index, 1, 12), bounds = monthRange(date.getFullYear(), date.getMonth());
        if (overlaps(bounds, { start, end })) months.push({ key: bounds.start.slice(0, 7), year: date.getFullYear(), month: date.getMonth(), ...bounds, role: range.role, basis: range.basis });
      }
    }
    if (!months.length) return { identity, state: 'empty', periods: [], message: 'No utility periods can be resolved from this saved history.' };
    const selectedKeys = new Set(months.map(month => month.key));
    const projected = eligible.map(meter => projectMeter(snapshot, source, meter, meters.find(item => item.meter.guid === meter.guid), record, selectedKeys,
      projectionEvidence));
    const projectionByMeter = new Map(projected.map(item => [item.meter.guid, item]));
    const monthlyRows: (TimeSeriesRow & { basis: 'calendar' | 'fiscal' })[] = months.map(month => {
      const values: Record<string, VisualizationObservation> = {};
      for (const bucket of buckets) {
        const contributions = bucket.meters.map(meter => {
          const observation = projectionByMeter.get(meter.guid)?.observations.get(month.key)
            ?? calendarizedObservation(meter, [], source, month.year, month.month, undefined);
          if (observation.state !== 'observed') record(meter, month.key, observation.reason);
          return observation;
        });
        values[utilitySeriesId(source.id, bucket.key)] = combineObservations(contributions);
      }
      return { periodKey: month.key, start: month.start, end: month.end, role: month.role, basis: month.basis, values };
    });
    let rows: readonly TimeSeriesRow[] = monthlyRows.map(({ basis: _basis, ...row }) => row);
    let periods: ResolvedVisualizationPeriod[];
    if (request.chart.interval === 'yearly') {
      const annual = new Map<string, { period: ResolvedVisualizationPeriod; rows: TimeSeriesRow[] }>();
      for (const row of monthlyRows) {
        const calendar = row.basis === 'fiscal' ? owner : { fiscalYear: 'calendarYear' as const, fiscalYearMonth: 0, fiscalYearCalendarEnd: true };
        const year = fiscalYear(row.start, calendar), bounds = fiscalRange(year, calendar), key = `${row.role}:${bounds.start}:${bounds.end}`;
        const item = annual.get(key) ?? { period: { ...bounds, role: row.role!, basis: row.basis, interval: 'yearly', ...(row.basis === 'fiscal' ? { fiscalYear: year } : {}),
          ...(identity.scope.kind === 'facility' ? { facilityGuid: identity.scope.facilityGuid } : {}) }, rows: [] };
        item.rows.push(row); annual.set(key, item);
      }
      rows = [...annual.values()].map(item => ({ periodKey: item.period.basis === 'fiscal' ? `FY${item.period.fiscalYear}` : item.period.start.slice(0, 4),
        start: item.period.start, end: item.period.end, role: item.period.role,
        values: Object.fromEntries(metadata.map(series => [series.id, combineObservations(item.rows.map(row => row.values[series.id]))])) }));
      periods = [...annual.values()].map(item => item.period);
    } else periods = ranges.map(range => {
      const matching = months.filter(month => month.role === range.role);
      return { role: range.role, start: matching[0].start, end: matching[matching.length - 1].end, basis: range.basis, interval: 'monthly',
        ...(identity.scope.kind === 'facility' ? { facilityGuid: identity.scope.facilityGuid } : {}) };
    });
    for (const period of periods) {
      const requested = ranges.find(range => range.role === period.role);
      if (requested && (period.start < requested.start || period.end > requested.end)) warnings.add(`${period.role === 'primary' ? 'Primary' : 'Comparison'} values retain whole ${period.interval} observations overlapping the requested dates; amounts are not prorated. Actual intervals are listed in Source data.`);
    }
    for (const diagnostic of diagnostics.values()) warnings.add(`${diagnostic.label}: ${diagnostic.reason} Periods: ${compressPeriods([...diagnostic.periods].sort())}.`);
    const provenance = [...new Set(rows.flatMap(row => Object.values(row.values).flatMap(observation => observation.state === 'observed' ? [observation.provenance] : [])))];
    return { identity, state: 'ready', resolved: { data: { kind: 'time-series', rows },
      alignment: { kind: request.chart.interval === 'monthly' ? 'civil-month' : periods.some(period => period.basis === 'fiscal') ? 'fiscal-interval' : 'civil-year',
        key: request.chart.interval === 'monthly' ? 'YYYY-MM' : periods.some(period => period.basis === 'fiscal') ? `fiscal:${owner.fiscalYearMonth}:${owner.fiscalYearCalendarEnd}` : 'YYYY' },
      series: metadata, periods, references: selection.references, provenance,
      quality: { partial: rows.some(row => Object.values(row.values).some(observation => observation.state === 'observed' ? observation.partial : observation.state !== 'excluded')), warnings: [...warnings] } } };
  } catch (error) { return unsupported(error instanceof Error ? error.message : 'This utility projection is unavailable.'); }
}

function projectMeter(snapshot: AccountWorkspaceSnapshot, source: UtilityVisualizationSource, meter: IdbUtilityMeter, projected: CalanderizedMeter | undefined,
  record: (meter: IdbUtilityMeter, key: string, reason: string) => void, selectedKeys: ReadonlySet<string>, projectionEvidence?: UtilityProjectionEvidence): MeterProjection {
  const observations = new Map<string, VisualizationObservation>();
  const readings = snapshot.meterData.filter(reading => reading.meterId === meter.guid).sort((left, right) => readingCivil(left).localeCompare(readingCivil(right)) || left.guid.localeCompare(right.guid));
  const ownershipInvalid = readings.some(reading => reading.accountId !== snapshot.account.guid || reading.facilityId !== meter.facilityId);
  const actualKeys = [...new Set((projected?.monthlyData.length ? projected.monthlyData.map(month => `${month.year}-${String(month.monthNumValue + 1).padStart(2, '0')}`)
    : readings.filter(reading => validCivil(readingCivil(reading))).map(reading => readingCivil(reading).slice(0, 7))))].filter(key => selectedKeys.has(key)).sort();
  if (actualKeys.some(key => !validCivil(`${key}-01`))) throw new Error('Canonical utility results contain an invalid period.');
  const allocation = meter.meterReadingDataApplication === 'backward' && readings.length >= 4 && readings.every(reading => validCivil(readingCivil(reading)))
    ? buildCalendarizationSummaries(meter, readings, 'backward') : undefined;
  // Unit ownership is supplied by the request's already-projected meter, not the ambient workspace.
  const from = source.measure === 'energy' ? projected?.energyUnit : source.measure === 'consumption' ? projected?.consumptionUnit : undefined;
  const savedUnitError = utilityInputUnitError(source, meter, from);
  const pinned = source.settings?.unit?.kind === 'pinned' ? source.settings.unit.value : undefined;
  if (!savedUnitError && pinned && from) {
    const conversion = new ConvertValue(1, from, pinned);
    if (conversion.hasError || !Number.isFinite(conversion.convertedValue)) throw new Error(`Cannot convert ${from} to ${pinned}. Choose compatible units.`);
  }
  if (source.measure === 'cost' && pinned && pinned !== 'USD') throw new Error('Costs use canonical USD; currency conversion is unavailable.');
  if (source.measure.endsWith('emissions') && pinned && pinned !== 'tonne CO2e') throw new Error('Emissions retain canonical tonne CO2e units.');
  if (source.measure === 'energy' && projected) {
    const requested = source.settings?.energyTreatment?.kind === 'pinned' ? source.settings.energyTreatment.value === 'source' : projected.energyIsSource;
    if (requested !== projected.energyIsSource) throw new Error('The canonical energy projection does not match the requested site/source treatment.');
    if (projected.energyIsSource && checkShowSiteToSource(meter.source, meter.includeInEnergy, meter.scope) && (!Number.isFinite(meter.siteToSource) || meter.siteToSource <= 0)) throw new Error('A selected meter has an invalid site-to-source multiplier.');
  }
  const monthlyByKey = new Map<string, MonthlyData>(), duplicateKeys = new Set<string>();
  for (const month of projected?.monthlyData ?? []) {
    const key = `${month.year}-${String(month.monthNumValue + 1).padStart(2, '0')}`;
    if (monthlyByKey.has(key)) duplicateKeys.add(key); else monthlyByKey.set(key, month);
  }
  const readingsByMonth = new Map<string, IdbUtilityMeterData[]>(), readingsByYear = new Map<number, IdbUtilityMeterData[]>();
  for (const reading of readings) {
    const key = readingCivil(reading).slice(0, 7);
    const month = readingsByMonth.get(key) ?? [], year = readingsByYear.get(reading.year) ?? [];
    month.push(reading); year.push(reading); readingsByMonth.set(key, month); readingsByYear.set(reading.year, year);
  }
  for (const key of actualKeys) {
    const year = Number(key.slice(0, 4)), month = Number(key.slice(5)) - 1;
    const data = monthlyByKey.get(key);
    let value = data ? measureValue(data, source) : undefined;
    if (!savedUnitError && pinned && from && typeof value === 'number') {
      const conversion = new ConvertValue(value, from, pinned);
      value = !conversion.hasError ? conversion.convertedValue : undefined;
    }
    let observation = ownershipInvalid ? unavailableObservation('Saved readings contradict their meter ownership.')
      : duplicateKeys.has(key) ? unavailableObservation('Duplicate canonical monthly results cannot be safely aggregated.')
      : calendarizedObservation(meter, readings, source, year, month, value, allocation);
    if (savedUnitError && observation.state !== 'excluded') observation = unavailableObservation(savedUnitError);
    const allocationDates = meter.meterReadingDataApplication === 'backward'
      ? new Set((allocation?.find(item => civilDate(item.calanderizedMonth).slice(0, 7) === key)?.monthReadingSummaries ?? [])
        .filter(item => item.daysApplied > 0).map(item => civilDate(item.readDate))) : undefined;
    const candidates = meter.meterReadingDataApplication === 'fullYear' ? readingsByYear.get(year) ?? []
      : allocationDates ? readings.filter(reading => allocationDates.has(readingCivil(reading))) : readingsByMonth.get(key) ?? [];
    if (observation.state === 'observed' && !meter.canBeNegative && source.measure !== 'cost'
      && candidates.some(reading => reading[utilityInputField(source, meter)] < 0)) observation = unavailableObservation('Negative usage is invalid for this meter.');
    if (observation.state !== 'excluded' && source.measure.endsWith('emissions')) {
      const emissionsError = emissionsInputError(snapshot, meter, candidates, source, year, projectionEvidence);
      if (emissionsError) observation = unavailableObservation(emissionsError);
    }
    if (data?.readingType === 'mixed') record(meter, key, 'Mixed measured and estimated bill contributions.');
    else if (data?.readingType === 'estimated') record(meter, key, 'Estimated saved bill contributions.');
    if (meter.noLongerInUse) record(meter, key, 'Retired meter: historical observations retained.');
    if (observation.state !== 'observed') record(meter, key, observation.reason);
    observations.set(key, observation);
  }
  return { meter, observations, actualKeys };
}

function measureValue(month: MonthlyData, source: UtilityVisualizationSource): number | undefined {
  return source.measure === 'energy' ? month.energyUse : source.measure === 'consumption' ? month.energyConsumption
    : source.measure === 'cost' ? month.energyCost : source.measure === 'location-emissions' ? month.totalWithLocationEmissions
      : source.measure === 'market-emissions' ? month.totalWithMarketEmissions : undefined;
}

function combineObservations(values: readonly VisualizationObservation[]): VisualizationObservation {
  if (values.length && values.every(value => value.state === 'excluded')) return unavailableObservation([...new Set(values.map(value => value.state === 'excluded' ? value.reason : ''))].join(' '), 'excluded');
  return aggregateUtilityObservations(values);
}

function emissionsInputError(snapshot: AccountWorkspaceSnapshot, meter: IdbUtilityMeter, readings: readonly IdbUtilityMeterData[],
  source: UtilityVisualizationSource, year: number, projectionEvidence?: UtilityProjectionEvidence): string | undefined {
  if (projectionEvidence?.includeEmissions !== true)
    return 'Emissions were not included in the authoritative meter projection.';
  return utilityEmissionsInputError(snapshot, meter, readings, { measure: source.measure === 'market-emissions' ? 'market-emissions' : 'location-emissions',
    year, emissionsRates: projectionEvidence.emissionsRates ?? snapshot.customEmissions });
}

function compressPeriods(keys: readonly string[]): string {
  const output: string[] = [];
  let first: string | undefined, last: string | undefined;
  const ordinal = (key: string) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5));
  const flush = () => { if (first) output.push(first === last ? first : `${first} through ${last}`); };
  for (const key of keys) {
    if (!first) first = last = key;
    else if (ordinal(key) === ordinal(last!) + 1) last = key;
    else { flush(); first = last = key; }
  }
  flush(); return output.join(', ');
}
