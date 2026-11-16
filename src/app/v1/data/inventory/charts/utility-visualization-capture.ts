import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { CalanderizedMeter } from '@data/models/calanderization';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { UtilityVisualizationSource, VisualizationDefinition, VisualizationSeriesOverride } from '@domain/visualizations/visualization-definition';
import { captureVisualizationDefinition } from '@domain/visualizations/visualization-integration';
import type { VisualizationCaptureResult } from '@domain/visualizations/visualization-integration';
import type { VisualizationSourceRequest } from '@domain/visualizations/visualization-source-provider';
import { utilityCapabilities, utilityChartSupport } from '@domain/visualizations/utility/utility-capabilities';
import { resolveCalendarizedUtility } from '@domain/visualizations/utility/utility-calendarized';
import { resolveUtilitySelection, utilityMeasureKey } from '@domain/visualizations/utility/utility-selection';
import type { InventoryChartView, InventoryChartSheetView } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.models';
import type { MeterChartGrouping } from '@app/v1/data/meters/inventory/charts/meter-inventory-charts';
import type { InventoryToolsContext, InventoryUtilityCaptureSelection } from '../inventory-tools.models';

export interface InventoryUtilityCaptureInput {
  readonly snapshot: AccountWorkspaceSnapshot;
  readonly context: InventoryToolsContext;
  readonly contextLabel: string;
  readonly selection?: InventoryUtilityCaptureSelection;
  readonly matchingGuids: readonly string[];
  readonly chart: InventoryChartView;
  readonly grouping: MeterChartGrouping;
  readonly view: InventoryChartSheetView;
  readonly projectedMeters: readonly CalanderizedMeter[];
  readonly workspaceRevision: number;
  readonly calendarDate: string;
}

/** Feature-owned intent and fidelity, never an ECharts option or a snapshot of calculated rows. */
export function captureInventoryUtility(input: InventoryUtilityCaptureInput): VisualizationCaptureResult {
  const unsupported = (...reasons: string[]): VisualizationCaptureResult => ({ state: 'unsupported', reasons });
  const { snapshot, context, chart } = input;
  if (context.resource !== 'meters' || snapshot.account.guid !== context.accountGuid) return unsupported('Open the owning meter inventory before capturing its chart.');
  if (!input.selection || input.selection.state !== 'supported') return unsupported(input.selection?.state === 'unsupported' ? input.selection.reason : 'This inventory has not supplied a supported saved selection rule.');
  if (input.selection.selection.resource !== 'meter') return unsupported('This chart requires an explicit matching-meter rule.');
  if (!['energy', 'water', 'cost'].includes(chart.id)) return unsupported('Choose an Energy, Water, or Cost chart before capture.');
  const facilitySelection = context.facilityGuid ? { kind: 'fixed' as const, facilityGuids: [context.facilityGuid] } : { kind: 'all' as const };
  const scope = resolveVisualizationFacilities({ accountGuid: snapshot.account.guid, facilitySelection }, snapshot.facilities).scope;
  const measure = chart.id === 'water' ? 'consumption' : chart.id as 'energy' | 'cost';
  const rule = structuredClone(input.selection.selection);
  const fullSelection = resolveUtilitySelection(snapshot, scope, { id: 'inventory-utility', kind: 'utility', measure, aggregation: 'sum', dataMode: 'calendarized', groupBy: 'meter', selection: rule });
  if (fullSelection.missing.length || !sameSet(fullSelection.meters.map(meter => meter.guid), input.matchingGuids)) return unsupported('The inventory selection no longer identifies exactly the charted meter set. Refresh before capturing.');
  const waterSources = rule.filter.utilitySources?.length ? rule.filter.utilitySources.filter(source => ['Water Intake', 'Water Discharge'].includes(source)) : ['Water Intake', 'Water Discharge'];
  if (chart.id === 'water' && !waterSources.length) return unsupported('The saved selection rule excludes the displayed water source. Refresh the chart before capture.');
  const selection = chart.id === 'water' ? { ...rule, filter: { ...rule.filter, utilitySources: waterSources } } : rule;
  const source: UtilityVisualizationSource = { id: 'inventory-utility', kind: 'utility', selectionMode: 'rule', measure, aggregation: 'sum', dataMode: 'calendarized',
    groupBy: input.grouping === 'facilities' ? 'facility' : input.grouping === 'groups' ? 'group' : 'meter', selection,
    ...(measure === 'energy' ? { settings: { unit: { kind: 'owner' as const }, energyTreatment: { kind: 'owner' as const } } }
      : measure === 'consumption' ? { settings: { unit: { kind: 'owner' as const } } } : {}) };
  const overrides: VisualizationSeriesOverride[] = [];
  const resources = new Map<string, string>();
  for (const [order, trace] of chart.metrics.entries()) {
    const resourceGuid = traceResource(input, trace.id);
    if (!resourceGuid) return unsupported('This chart contains an unassigned or unavailable group identity. Choose Individual meters, or assign the meters to saved groups before capture.');
    if (trace.lineStyle && !['solid', 'dashed', 'dotted'].includes(String(trace.lineStyle))) return unsupported('This chart uses a line pattern that saved visualizations cannot yet preserve. Reduce the trace set or use a supported line pattern before capture.');
    resources.set(trace.id, resourceGuid);
    overrides.push({ resourceGuid, accountGuid: snapshot.account.guid, order, label: trace.label, visible: !input.view.hiddenGuids.includes(trace.id),
      ...(trace.color ? { color: trace.color } : {}), ...(trace.lineStyle ? { lineStyle: trace.lineStyle as 'solid' | 'dashed' | 'dotted' } : {}) });
  }
  if (!chart.metrics.some(trace => !input.view.hiddenGuids.includes(trace.id))) return unsupported('Show at least one trace before capturing this chart.');
  const definition: VisualizationDefinition = { ...createVisualizationDefinition(`${input.contextLabel} · ${chart.title} trend`, snapshot.account.guid, facilitySelection, 'utility'),
    sources: [source], period: { kind: 'all-history' }, comparison: { kind: 'none' },
    series: [{ id: 'inventory-series', sourceId: source.id, metric: utilityMeasureKey(source), axis: 'left', overrides }],
    chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'monthly', stack: 'none' }, appearance: { legend: false, title: `${chart.title} monthly data` } };
  const request: VisualizationSourceRequest = { identity: { accountGuid: snapshot.account.guid, scope, workspaceRevision: input.workspaceRevision,
    definitionGuid: 'inventory-capture', definitionRevision: 1, requestId: 'inventory-capture', sourceId: source.id }, source, chart: definition.chart!, period: definition.period,
    comparison: definition.comparison, series: definition.series, dateContext: { calendarDate: input.calendarDate } };
  const resolution = resolveCalendarizedUtility(snapshot, request, input.projectedMeters);
  if (resolution.state !== 'ready' || resolution.resolved.data.kind !== 'time-series') return unsupported(resolution.state === 'missing-source' || resolution.state === 'unsupported' || resolution.state === 'error'
    ? resolution.message : 'Current chart values cannot be reproduced safely by the saved utility provider.');
  const resolved = resolution.resolved, rows = resolution.resolved.data.rows;
  if (resolved.series.some(series => ![...resources.values()].includes(series.resourceGuid ?? '')) || resolved.series.length !== chart.metrics.length) return unsupported('The saved provider would change the chart grouping or meter membership.');
  for (const trace of chart.metrics.filter(trace => !input.view.hiddenGuids.includes(trace.id))) {
    const series = resolved.series.find(series => series.resourceGuid === resources.get(trace.id));
    if (!series || series.unit !== chart.unit) return unsupported('The saved provider would change the chart units or selected series.');
    const savedRows = new Map(rows.map(row => [monthIndex(row.start), row]));
    if (!sameSet([...savedRows.keys()], chart.rows.map(row => row.periodKey))) return unsupported('The saved provider would change the chart period coverage.');
    for (const row of chart.rows) {
      const expected = row.values[trace.id], actual = savedRows.get(row.periodKey)?.values[series.id];
      if (expected === undefined || expected === null || !Number.isFinite(expected)) {
        if (actual?.state === 'observed') return unsupported('The saved provider would fill a gap in this chart. Review saved data before capture.');
      } else if (actual?.state !== 'observed' || actual.partial || actual.provenance !== 'measured' || !equalValue(expected, actual.value)) {
        return unsupported('This chart contains values whose quality or allocation cannot be preserved faithfully. Review the saved readings or choose another chart.');
      }
    }
  }
  return captureVisualizationDefinition(definition, [{ request, capabilities: utilityCapabilities(source), chartSupport: utilityChartSupport(source, definition.chart!), resolution }],
    { sourceIdentities: 'durable', omissions: [], preserved: ['sources', 'filters', 'aggregation', 'settings', 'series', 'periods', 'appearance', 'chart-settings'] });
}

function traceResource(input: InventoryUtilityCaptureInput, traceId: string): string | undefined {
  if (input.grouping === 'meters') return input.snapshot.meters.find(meter => meter.guid === traceId && input.matchingGuids.includes(meter.guid))?.guid;
  if (input.grouping === 'facilities') return input.snapshot.facilities.find(facility => `facility:${facility.guid}` === traceId && facility.accountId === input.snapshot.account.guid)?.guid;
  return input.snapshot.meterGroups.find(group => `group:${group.facilityId}:${group.guid}` === traceId && group.accountId === input.snapshot.account.guid)?.guid;
}
function sameSet(left: readonly string[], right: readonly string[]): boolean { return new Set(left).size === new Set(right).size && left.every(value => right.includes(value)); }
function equalValue(left: number, right: number): boolean { return left === right || Math.abs(left - right) <= Number.EPSILON * 16 * Math.max(1, Math.abs(left), Math.abs(right)); }
function monthIndex(value: string): string { return String(Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1); }
