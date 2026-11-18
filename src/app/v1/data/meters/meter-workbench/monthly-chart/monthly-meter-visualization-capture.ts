import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { CalanderizedMeter } from '@data/models/calanderization';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { UtilityVisualizationSource, VisualizationDefinition, VisualizationSeries } from '@domain/visualizations/visualization-definition';
import { captureVisualizationDefinition, VisualizationCaptureResult } from '@domain/visualizations/visualization-integration';
import type { VisualizationSourceEvidence, VisualizationSourceRequest } from '@domain/visualizations/visualization-source-provider';
import { resolveCalendarizedUtility } from '@domain/visualizations/utility/utility-calendarized';
import { utilityCapabilities, utilityChartSupport } from '@domain/visualizations/utility/utility-capabilities';
import { utilityMeasureKey } from '@domain/visualizations/utility/utility-selection';
import type { MeterResultsChartMetric, MeterResultsChartPresentation, MeterResultsChartRow } from '@app/v1/shared/charts/metric-results-chart.models';

export interface MonthlyMeterCaptureInput {
  readonly snapshot: AccountWorkspaceSnapshot;
  readonly facilityGuid: string;
  readonly meterGuid: string;
  readonly projectedMeter: CalanderizedMeter;
  readonly metrics: readonly MeterResultsChartMetric[];
  readonly rows: readonly MeterResultsChartRow[];
  readonly presentation: MeterResultsChartPresentation;
  readonly workspaceRevision: number;
  readonly calendarDate: string;
}

/** Reproduce feature-owned meaning; never save calculated rows or ECharts options. */
export function captureMonthlyMeter(input: MonthlyMeterCaptureInput): VisualizationCaptureResult {
  const unsupported = (...reasons: string[]): VisualizationCaptureResult => ({ state: 'unsupported', reasons });
  const { snapshot, presentation: view, projectedMeter } = input;
  const facility = snapshot.facilities.find(item => item.guid === input.facilityGuid && item.accountId === snapshot.account.guid);
  const meter = snapshot.meters.find(item => item.guid === input.meterGuid && item.accountId === snapshot.account.guid && item.facilityId === input.facilityGuid);
  if (!facility || !meter || projectedMeter.meter.guid !== meter.guid || !meter.meterReadingDataApplication)
    return unsupported('Open a ready monthly chart in its owning account and facility before capturing.');
  if (!input.rows.length) return unsupported('Add monthly readings before saving this visualization.');
  const configured = [
    { metricId: view.leftMetricId, axis: 'left' as const, type: view.leftTraceType, display: view.leftDisplay, color: 'var(--v1-chart-series-1)' },
    { metricId: view.rightMetricId, axis: 'right' as const, type: view.rightTraceType, display: view.rightDisplay, color: 'var(--v1-chart-series-3)' }
  ].filter(item => !!item.metricId);
  if (!configured.some(item => item.display !== 'off' && !view.hiddenMetricIds.includes(item.metricId!)))
    return unsupported('Show at least one chart series before saving this visualization.');
  const sources: UtilityVisualizationSource[] = [], series: VisualizationSeries[] = [];
  for (const item of configured) {
    const metric = input.metrics.find(metric => metric.id === item.metricId);
    const measure = item.metricId === 'energyUse' ? 'energy' : item.metricId === 'energyConsumption' ? 'consumption' : item.metricId === 'energyCost' ? 'cost' : undefined;
    if (!metric || !measure || measure === 'consumption' && meter.scope === 2)
      return unsupported('This monthly chart uses a specialized measure that saved visualizations cannot yet preserve.');
    const unit = metric.currency ? 'USD' : metric.unit;
    if (!unit) return unsupported('This chart has no reproducible display unit.');
    const source: UtilityVisualizationSource = { id: `monthly-${metric.id}`, kind: 'utility', selectionMode: 'meter',
      selection: { kind: 'fixed', resource: 'meter', guids: [meter.guid] }, measure, aggregation: 'none', dataMode: 'calendarized', groupBy: 'meter',
      settings: { unit: { kind: 'pinned', value: unit },
        ...(measure === 'energy' ? { energyTreatment: { kind: 'pinned' as const, value: projectedMeter.energyIsSource ? 'source' as const : 'site' as const } } : {}) } };
    sources.push(source);
    series.push({ id: `${source.id}-series`, sourceId: source.id, metric: utilityMeasureKey(source), resourceGuid: meter.guid,
      axis: item.axis, label: metric.label, color: item.color, traceType: item.type, lineStyle: 'solid',
      visible: item.display !== 'off' && !view.hiddenMetricIds.includes(metric.id) });
  }
  const definition: VisualizationDefinition = {
    ...createVisualizationDefinition(`${facility.name || 'Facility'} - Monthly ${meter.name || meter.source}`, snapshot.account.guid,
      { kind: 'fixed', facilityGuids: [facility.guid] }, 'utility'),
    sources, series, period: { kind: 'all-history' }, comparison: { kind: 'none' },
    chart: { kind: 'time-series', interval: 'monthly', defaultTraceType: 'line', stack: 'none', smoothLines: view.smoothLines },
    appearance: { legend: view.legend }
  };
  const evidence: VisualizationSourceEvidence[] = [];
  const expectedRows = new Map(input.rows.map(row => [monthKey(row.periodKey), row]));
  if (expectedRows.size !== input.rows.length) return unsupported('Duplicate monthly periods cannot be captured safely.');
  for (const source of sources) {
    const request: VisualizationSourceRequest = { identity: { accountGuid: snapshot.account.guid,
      scope: { kind: 'facility', facilityGuid: facility.guid, facilityGuids: [facility.guid] }, workspaceRevision: input.workspaceRevision,
      definitionGuid: 'monthly-meter-capture', definitionRevision: 1, requestId: 'monthly-meter-capture', sourceId: source.id },
      source, chart: definition.chart!, period: definition.period, comparison: definition.comparison, series: definition.series.filter(series => series.sourceId === source.id),
      dateContext: { calendarDate: input.calendarDate } };
    const resolution = resolveCalendarizedUtility(snapshot, request, [projectedMeter]);
    if (resolution.state !== 'ready' || resolution.resolved.data.kind !== 'time-series')
      return unsupported('message' in resolution ? resolution.message : 'The saved provider cannot reproduce this monthly chart.');
    const metadata = resolution.resolved.series;
    if (metadata.length !== 1 || metadata[0].resourceGuid !== meter.guid || source.settings?.unit?.kind !== 'pinned' || metadata[0].unit !== source.settings.unit.value)
      return unsupported('The saved provider would change the selected meter or displayed units.');
    const rows = resolution.resolved.data.rows;
    if (rows.length !== expectedRows.size || rows.some(row => !expectedRows.has(row.start.slice(0, 7))))
      return unsupported('The saved provider would change this chart’s monthly coverage.');
    const metricId = source.id.slice('monthly-'.length);
    for (const row of rows) {
      const expected = expectedRows.get(row.start.slice(0, 7))!.values[metricId], actual = row.values[metadata[0].id];
      if (expected === null || expected === undefined || !Number.isFinite(expected)) {
        if (actual?.state === 'observed') return unsupported('The saved provider would fill a gap in this chart.');
      } else if (actual?.state !== 'observed' || actual.partial || actual.provenance !== 'measured' || !equalValue(expected, actual.value)) {
        return unsupported('This chart contains values whose quality or monthly allocation cannot be preserved faithfully. Review the meter’s readings and settings before capture.');
      }
    }
    evidence.push({ request, capabilities: utilityCapabilities(source), chartSupport: utilityChartSupport(source, definition.chart!), resolution });
  }
  return captureVisualizationDefinition(definition, evidence, { sourceIdentities: 'durable', omissions: [],
    preserved: ['sources', 'filters', 'aggregation', 'settings', 'series', 'periods', 'appearance', 'chart-settings'] });
}

function monthKey(period: string): string {
  const [year, month] = period.split('-');
  return `${year}-${String(Number(month) + 1).padStart(2, '0')}`;
}
function equalValue(left: number, right: number): boolean {
  return left === right || Math.abs(left - right) <= Number.EPSILON * 16 * Math.max(1, Math.abs(left), Math.abs(right));
}
