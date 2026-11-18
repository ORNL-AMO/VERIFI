import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { VisualizationSourceRequest, VisualizationSourceResolution } from '../visualization-source-provider';
import { compositionData, compositionPeriodIssue, isCompositionChart, sumCompositionObservations, type CompositionContribution } from '../visualization-composition';
import { discoverUtilitySeries } from './utility-catalog';
import { resolveUtilitySelection, utilityBuckets, utilitySeriesId } from './utility-selection';

/** Aggregate original monthly observations, never chart pixels or annual summary snapshots. */
export function resolveUtilityComposition(snapshot: AccountWorkspaceSnapshot, request: VisualizationSourceRequest,
  resolveMonthly: (request: VisualizationSourceRequest) => VisualizationSourceResolution): VisualizationSourceResolution {
  const { identity, source, chart } = request;
  if (source.kind !== 'utility' || !isCompositionChart(chart) || chart.kind === 'sankey') return { identity, state: 'unsupported', message: 'Choose a utility breakdown or hierarchy.' };
  const issue = compositionPeriodIssue({ sources: [source], period: request.period, comparison: request.comparison });
  if (issue) return { identity, state: 'unsupported', message: issue };
  const monthly = resolveMonthly({ ...request, source: { ...source, groupBy: 'meter', aggregation: 'none' },
    chart: { kind: 'time-series', defaultTraceType: 'bar', interval: 'monthly', stack: 'none' } });
  if (monthly.state !== 'ready' || monthly.resolved.data.kind !== 'time-series') return monthly;
  const data = monthly.resolved, rows = monthly.resolved.data.rows;
  const selection = resolveUtilitySelection(snapshot, identity.scope, source);
  if (source.measure === 'consumption' && new Set(selection.meters.filter(meter => data.series.some(series => series.resourceGuid === meter.guid)).map(meter => meter.source)).size > 1) return { identity, state: 'unsupported', message: 'Consumption composition requires one utility meaning. Choose Energy to combine compatible energy sources.' };
  const buckets = utilityBuckets(snapshot, source, selection.meters.filter(meter => data.series.some(series => series.resourceGuid === meter.guid)));
  const series = discoverUtilitySeries(snapshot, identity.scope, source);
  if (series.length !== buckets.length) return { identity, state: 'unsupported', message: 'Choose compatible units for every utility category before computing composition totals.' };
  const contributions: CompositionContribution[] = buckets.flatMap(bucket => bucket.meters.map(meter => {
    const facility = snapshot.facilities.find(value => value.guid === meter.facilityId)!;
    const group = snapshot.meterGroups.find(value => value.guid === meter.groupId && value.facilityId === meter.facilityId && value.accountId === snapshot.account.guid);
    const observations = rows.map(row => row.values[utilitySeriesId(source.id, meter.guid)] ?? { state: 'missing' as const, value: null, reason: 'No observation for this month.' });
    return { id: JSON.stringify(['meter', meter.guid]), seriesId: utilitySeriesId(source.id, bucket.key), label: bucket.label,
      observation: sumCompositionObservations(observations), categories: {
        facility: { id: facility.guid, label: facility.name || 'Unnamed facility' }, source: { id: meter.source, label: meter.source },
        group: { id: group?.guid ?? `unassigned:${facility.guid}`, label: group?.name ?? 'Unassigned' },
        meter: { id: meter.guid, label: meter.name || 'Unnamed meter' }
      }, details: rows.map((row, index) => `${row.start} – ${row.end}: ${observations[index].state === 'observed' ? observations[index].value : observations[index].reason}`) };
  }));
  const composition = { contributions, denominators: [], diagnostics: data.quality.warnings };
  return { identity, state: 'ready', resolved: { ...data, series, references: selection.references,
    periods: data.periods.map(period => request.period.kind === 'fiscal-year' ? { ...period, fiscalYear: request.period.year } : period),
    composition, data: compositionData(chart, composition), alignment: { kind: chart.kind === 'breakdown' ? 'category' : 'hierarchy', key: 'selected-period-composition' } } };
}
