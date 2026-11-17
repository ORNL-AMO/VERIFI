import { type EnergyUseBucket, EQUIPMENT_TYPES, energyUseBuckets, energyUseSelectionMode, energyUseResourceKind, energyUseSeriesId, selectedEnergyUseIds } from './equipment-selection';
export { equipmentCatalog } from './equipment-selection';
import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { energyUseChartYears, savedEnergyUseYears, energyUseFiscalPeriod, projectEnergyUse, knownEnergyUseAmount, type ProjectedEnergyUse } from '@domain/calculations/energy-footprint/energy-use-projection';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import type { EnergyUseVisualizationSource, VisualizationChart, VisualizationDefinition, VisualizationScope } from '../visualization-definition';
import type { VisualizationChartSupport, VisualizationObservation, VisualizationSourceCapabilities, VisualizationSourceRequest, VisualizationSourceResolution } from '../visualization-source-provider';

export const equipmentSeriesId = (sourceId: string, guid: string): string => `${sourceId}:equipment:${guid}`;
export function equipmentUnit(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, source: EnergyUseVisualizationSource): string {
  return source.settings?.unit?.kind === 'pinned' ? source.settings.unit.value
    : scope.kind === 'facility' ? snapshot.facilities.find(f => f.guid === scope.facilityGuid)?.energyUnit ?? '' : snapshot.account.energyUnit;
}
export function equipmentCapabilities(): VisualizationSourceCapabilities {
  return { kind: 'energy-use', measures: ['consumption'], aggregations: ['none', 'sum'], periods: ['all-history', 'latest-saved-year', 'fiscal-year'],
    comparisons: ['none'], chartKinds: ['time-series'], shapes: ['time-series'], alignments: ['fiscal-interval'], settings: ['unit'],
    controls: ['series', 'appearance', 'axes', 'stacking'], allowDateOverride: true, allowMultipleSources: false };
}
export function equipmentChartSupport(source: EnergyUseVisualizationSource, chart: VisualizationChart): VisualizationChartSupport {
  const reasons: string[] = [];
  if (chart.kind !== 'time-series' || chart.interval !== 'yearly') reasons.push('Equipment history supports yearly line, bar or area charts.');
  const mode = energyUseSelectionMode(source);
  if (source.measure !== 'consumption' || source.aggregation !== (mode === 'equipment' ? 'none' : 'sum')) reasons.push('Use annual consumption with one trace per selected item, group, type or facility.');
  if (!mode || !selectedEnergyUseIds(source).length) reasons.push('Choose how to select Energy Uses, then select resources.');
  if (mode === 'equipment-type' ? source.selection !== undefined || !source.equipmentTypes?.length || source.equipmentTypes.some(type => !EQUIPMENT_TYPES.includes(type))
    : mode && (source.equipmentTypes !== undefined || source.selection?.kind !== 'fixed' || source.selection.resource !== energyUseResourceKind(mode))) reasons.push('Repair the selection to match the Energy Use selection method.');
  if (source.settings?.energyTreatment) reasons.push('Equipment history retains saved energy meaning without site/source treatment changes.');
  return reasons.length ? { chart, state: 'unsupported', reasons } : { chart, state: 'supported' };
}
export function equipmentPeriodIssue(request: Pick<VisualizationSourceRequest, 'period' | 'comparison'>): string | undefined {
  return request.comparison.kind !== 'none' || !['all-history', 'latest-saved-year', 'fiscal-year'].includes(request.period.kind)
    ? 'Equipment history supports all history, latest saved fiscal year, or one pinned fiscal year without comparison.' : undefined;
}
/** An explicit user action, also used for fresh Energy Use-only line/bar setup. */
export function useEquipmentHistorySettings(definition: VisualizationDefinition, sourceId: string): VisualizationDefinition {
  const chart = definition.chart;
  return { ...definition, sources: definition.sources.map(source => {
    if (source.id !== sourceId || source.kind !== 'energy-use') return source;
    return { ...source, measure: 'consumption', aggregation: !energyUseSelectionMode(source) || energyUseSelectionMode(source) === 'equipment' ? 'none' : 'sum', settings: { unit: source.settings?.unit ?? { kind: 'owner' } } };
  }), chart: { kind: 'time-series', defaultTraceType: chart?.kind === 'time-series' ? chart.defaultTraceType : 'line', interval: 'yearly', stack: 'none' },
  period: ['all-history', 'latest-saved-year', 'fiscal-year'].includes(definition.period.kind) ? definition.period : { kind: 'latest-saved-year', basis: 'fiscal' },
  comparison: { kind: 'none' }, series: definition.series.map(series => series.sourceId === sourceId ? { ...series, metric: 'consumption' } : series) };
}
function observation(row: ProjectedEnergyUse): VisualizationObservation {
  const amount = knownEnergyUseAmount(row);
  const notes = row.sources.map(source => `${source.source} · occurrence ${source.sourceIndex + 1} (${source.id}) · ${source.description}${source.originYear !== undefined ? ` · Source FY ${source.originYear}` : ''}${source.originalAmount !== undefined ? ` · Saved ${source.originalAmount} ${source.originalUnit}` : ''}`);
  if (!row.sources.length) notes.push('No saved utility sources.');
  if (row.partial) notes.unshift('Partial coverage · known source values only');
  if (row.item.noLongerInUse?.isNoLongerInUse && Number.isInteger(row.item.noLongerInUse.year) && row.sources.some(source => source.state === 'entered' && source.year > row.item.noLongerInUse.year)) notes.push(`Explicit saved history after retirement FY ${row.item.noLongerInUse.year}`);
  if (amount !== null && !Number.isFinite(amount)) notes.unshift('The annual total is nonfinite and cannot be displayed.');
  if (amount === null || !Number.isFinite(amount)) return { state: 'missing', value: null, reason: notes.join('; ') || 'No saved utility sources.' };
  return { state: 'observed', value: amount, provenance: row.carried ? 'carried-forward' : 'estimated', partial: row.partial, notes };
}
/** Reads annual saved amounts; never creates history or recalculates equipment consumption. */
export function resolveEquipment(snapshot: AccountWorkspaceSnapshot, request: VisualizationSourceRequest): VisualizationSourceResolution {
  const { identity, source, period } = request;
  const unsupported = (message: string): VisualizationSourceResolution => ({ identity, state: 'unsupported', message });
  if (source.kind !== 'energy-use') return unsupported('Choose an Energy Use source.');
  const support = equipmentChartSupport(source, request.chart);
  if (support.state === 'unsupported') return unsupported(support.reasons.join(' '));
  if (snapshot.account.guid !== identity.accountGuid) return unsupported('The equipment does not belong to this account.');
  const periodIssue = equipmentPeriodIssue(request);
  if (periodIssue) return unsupported(periodIssue);
  const selection = energyUseBuckets(snapshot, identity.scope, source), buckets = selection.buckets;
  if (selection.missing.length) return { identity, state: 'missing-source', references: selection.missing, message: 'Repair the selected Energy Use references.' };
  const items = [...new Map(buckets.flatMap(bucket => bucket.items).map(item => [item.guid, item])).values()];
  const unit = equipmentUnit(snapshot, identity.scope, source);
  if (!unit || new ConvertValue(undefined, '', '').getUnit(unit)?.measure !== 'energy') return unsupported('Choose a supported energy display unit.');
  const saved = savedEnergyUseYears(items);
  const years = period.kind === 'fiscal-year' ? [period.year] : period.kind === 'latest-saved-year' ? saved.slice(-1) : energyUseChartYears(items);
  if (!years.length) return { identity, state: 'empty', periods: [], message: 'No saved equipment years are available for the selected items.' };
  if (years.length * buckets.reduce((count, bucket) => count + Math.max(1, bucket.items.length), 0) > 250000) return unsupported('Narrow the Energy Use selection or pin a fiscal year.');
  const series = equipmentSeriesMetadata(source, unit, buckets);
  const facilityGuids = [...new Set([...items.map(item => item.facilityId), ...buckets.flatMap(bucket => bucket.facilityGuid ? [bucket.facilityGuid] : [])])];
  if (!facilityGuids.length) return { identity, state: 'empty', periods: [], message: 'No equipment currently matches the selected categories.' };
  const periods: { role: 'primary'; start: string; end: string; basis: 'fiscal'; interval: 'yearly'; fiscalYear: number; facilityGuid: string }[] = [];
  const rows: { periodKey: string; start: string; end: string; values: Record<string, VisualizationObservation> }[] = [];
  const provenance = new Set<'estimated' | 'carried-forward'>();
  for (const year of years) {
    const projections = items.map(item => projectEnergyUse(item, snapshot.facilities.find(f => f.guid === item.facilityId)!, year, unit));
    if (projections.some(row => !row)) return unsupported('Repair the selected equipment facilities’ fiscal calendars.');
    const byGuid = new Map(projections.map(row => [row!.item.guid, row!]));
    const fiscal = facilityGuids.map(guid => ({ guid, period: energyUseFiscalPeriod(snapshot.facilities.find(f => f.guid === guid)!, year) }));
    if (fiscal.some(value => !value.period)) return unsupported('Repair the selected Energy Use facilities’ fiscal calendars.');
    if (new Set(fiscal.map(value => value.period!.key)).size !== 1) return unsupported(`FY ${year} has different actual fiscal intervals across the selected Energy Uses. Select matching fiscal periods.`);
    const [start, end] = fiscal[0].period!.key.split(' / ');
    if (![start, end].every(date => /^\d{4}-\d{2}-\d{2}$/.test(date) && !date.startsWith('0000'))) return unsupported('The fiscal interval falls outside supported civil years 1–9999.');
    const values: Record<string, VisualizationObservation> = {};
    for (const bucket of buckets) {
      const members = bucket.items.map(item => byGuid.get(item.guid)!);
      const points = members.map(observation);
      const known = points.filter((point): point is Extract<VisualizationObservation, { state: 'observed' }> => point.state === 'observed');
      const amount = known.reduce((sum, point) => sum + point.value, 0);
      const notes = points.flatMap((point, index) => point.state === 'observed'
        ? point.notes?.map(note => `${members[index].item.name}: ${note}`) ?? [] : [`${members[index].item.name}: ${point.reason}`]);
      const point: VisualizationObservation = !known.length || !Number.isFinite(amount)
        ? { state: 'missing', value: null, reason: !points.length ? 'No equipment currently matches this selection.' : !Number.isFinite(amount) ? 'The combined annual total is nonfinite.' : notes.join('; ') }
        : points.length === 1 && energyUseSelectionMode(source) === 'equipment' ? points[0]
          : { state: 'observed', value: amount, partial: known.length !== points.length || known.some(point => point.partial), provenance: known.some(point => point.provenance === 'carried-forward') ? 'carried-forward' : 'estimated', notes };
      values[energyUseSeriesId(source, bucket.key)] = point;
      if (point.state === 'observed') provenance.add(point.provenance as 'estimated' | 'carried-forward');
      if (members.some(row => row.sources.some(value => value.state === 'entered'))) provenance.add('estimated');
    }
    periods.push(...fiscal.map(value => ({ role: 'primary' as const, start, end, basis: 'fiscal' as const, interval: 'yearly' as const, fiscalYear: year, facilityGuid: value.guid })));
    rows.push({ periodKey: `FY ${year}`, start, end, values });
  }
  const hasValues = rows.some(row => Object.values(row.values).some(point => point.state === 'observed'));
  if (!hasValues) return { identity, state: 'empty', periods, message: 'No usable equipment values in the requested fiscal period.',
    reasons: rows.flatMap(row => Object.entries(row.values).map(([id, value]) => `${series.find(s => s.id === id)!.label} · ${row.periodKey}: ${value.state === 'observed' ? '' : value.reason}`)) };
  return { identity, state: 'ready', resolved: { data: { kind: 'time-series', rows }, alignment: { kind: 'fiscal-interval', key: 'actual-annual-interval' }, series, periods,
    references: selection.references, provenance: [...provenance],
    quality: { partial: rows.some(row => Object.values(row.values).some(point => point.state !== 'observed' || point.partial)), warnings: [] } } };
}

/** Catalog metadata only; does not project annual values or request calculations. */
export function discoverEquipmentSeries(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, source: EnergyUseVisualizationSource) {
  const { buckets } = energyUseBuckets(snapshot, scope, source);
  const unit = equipmentUnit(snapshot, scope, source);
  return equipmentSeriesMetadata(source, unit, buckets);
}
function equipmentSeriesMetadata(source: EnergyUseVisualizationSource, unit: string, buckets: readonly EnergyUseBucket[]) {
  return buckets.map(bucket => ({ id: energyUseSeriesId(source, bucket.key), sourceId: source.id, metric: 'consumption',
    ...(bucket.resourceGuid ? { resourceGuid: bucket.resourceGuid } : {}), label: bucket.label, unit, dimension: 'energy', additive: true,
    contributionKeys: bucket.items.flatMap(item => item.utilityData.map((value, index) => JSON.stringify([item.guid, index, value.energySource]))) }));
}
