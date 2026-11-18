import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { CalanderizedMeter } from '@data/models/calanderization';
import type { IdbFacility } from '@data/models/idbModels/facility';
import type { UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';
import type { VisualizationObservation } from '@domain/visualizations/visualization-source-provider';
import { latestUtilityHistoryMonth, resolveCalendarizedUtility } from '@domain/visualizations/utility/utility-calendarized';
import { fiscalYear, civilDate } from '@domain/visualizations/utility/utility-periods';
import { utilityYearToDate, utilityYearToDateRange } from '@domain/visualizations/utility/utility-year-to-date';
import type { MeterResultsChartMetric, MeterResultsChartRow } from '@app/v1/shared/charts/metric-results-chart.models';
import { buildMeterYearlyDataRows, meterYearlyChartRows } from '../../models';

/** Source-owned annual presentation; canonical observations supply quality and YTD values. */
export function yearlyMeterData(snapshot: AccountWorkspaceSnapshot | undefined, projected: CalanderizedMeter | undefined,
  facility: IdbFacility | undefined, metrics: readonly MeterResultsChartMetric[], yearToDate: boolean) {
  const allRows = projected?.monthlyData ?? [];
  const anchor = snapshot && projected ? latestUtilityHistoryMonth(snapshot, [projected.meter], [projected]) : undefined;
  const context = yearToDate && anchor && facility ? utilityYearToDate(anchor, facility) : undefined;
  const filtered = context && facility ? allRows.filter(row => {
    const date = `${row.year}-${String(row.monthNumValue + 1).padStart(2, '0')}-01`;
    const range = utilityYearToDateRange(fiscalYear(date, facility), facility, context);
    return date >= range.start && date <= range.end && date <= context.anchor;
  }) : yearToDate ? [] : allRows;
  let rows: readonly MeterResultsChartRow[] = meterYearlyChartRows(buildMeterYearlyDataRows(filtered));
  const observations: Record<string, Record<string, VisualizationObservation>> = {};
  if (snapshot && projected && facility && (!yearToDate || context)) for (const metric of metrics) {
    const measure = metric.id === 'energyUse' ? 'energy' : metric.id === 'energyConsumption' ? 'consumption' : metric.id === 'energyCost' ? 'cost' : undefined;
    if (!measure) continue;
    const source: UtilityVisualizationSource = { id: `yearly-${metric.id}`, kind: 'utility', selectionMode: 'meter', selection: { kind: 'fixed', resource: 'meter', guids: [projected.meter.guid] }, measure, dataMode: 'calendarized', aggregation: 'none', groupBy: 'meter', settings: {
      unit: { kind: 'pinned', value: metric.currency ? 'USD' : metric.unit ?? '' }, ...(measure === 'energy' ? { energyTreatment: { kind: 'pinned', value: projected.energyIsSource ? 'source' : 'site' } } : {}) } };
    const result = resolveCalendarizedUtility(snapshot, { identity: { accountGuid: snapshot.account.guid, scope: { kind: 'facility', facilityGuid: facility.guid, facilityGuids: [facility.guid] }, workspaceRevision: 0, definitionGuid: 'yearly-meter', definitionRevision: 1, requestId: 'yearly-meter', sourceId: source.id }, source,
      chart: { kind: 'time-series', interval: 'yearly', defaultTraceType: 'line', stack: 'none', ...(yearToDate ? { yearToDate: true } : {}) }, period: { kind: 'all-history' }, comparison: { kind: 'none' }, series: [], dateContext: { calendarDate: civilDate(new Date()), ...(anchor ? { latestDataDate: anchor } : {}) } }, [projected]);
    if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') {
      for (const row of rows) (observations[row.periodKey] ??= {})[metric.id] = { state: 'missing', value: null, reason: 'message' in result ? result.message : 'The canonical observation is unavailable.' };
      continue;
    }
    for (const row of result.resolved.data.rows) {
      const year = String(fiscalYear(row.start, facility));
      (observations[year] ??= {})[metric.id] = row.values[result.resolved.series[0].id];
    }
  }
  if (yearToDate && context) {
    const byYear = new Map(rows.map(row => [row.periodKey, row]));
    rows = meterYearlyChartRows(buildMeterYearlyDataRows(allRows)).filter(row => Number(row.periodKey) <= fiscalYear(context.anchor, facility!)).map(row => byYear.get(row.periodKey) ?? { ...row, values: Object.fromEntries(Object.keys(row.values).map(key => [key, null])) });
  }
  if (yearToDate) rows = rows.map(row => ({ ...row, periodLabel: `${row.periodLabel} YTD`, values: Object.fromEntries(Object.entries(row.values).map(([metric, value]) => {
    const observation = observations[row.periodKey]?.[metric];
    return [metric, observation ? observation.state === 'observed' ? observation.value : null : value];
  })) }));
  rows = rows.map(row => ({ ...row, annotations: Object.fromEntries(Object.entries(observations[row.periodKey] ?? {}).map(([metric, observation]) => {
    const bounds = facility && context ? utilityYearToDateRange(Number(row.periodKey), facility, context) : undefined;
    const quality = observation.state === 'observed' ? `${observation.provenance}${observation.partial ? ' · partial subtotal' : ''}` : `${observation.state}: ${observation.reason}`;
    return [metric, `${bounds ? bounds.start + ' – ' + bounds.end + ' · ' : ''}${quality}`];
  })) }));
  return { rows, observations, context, anchor };
}
