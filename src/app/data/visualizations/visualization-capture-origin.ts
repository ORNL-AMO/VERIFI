import type { AccountWorkspaceSnapshot } from '../account-workspace/account-workspace.models';
import type { IdbSavedVisualization } from '../models/idbModels/savedVisualization';
import { normalizeVisualizationDefinition, type VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { serializeVisualizationDefinition } from '@domain/visualizations/visualization-source-groups';

export interface VisualizationCaptureSource {
  readonly kind: 'meter-monthly' | 'meter-monthly-patterns' | 'meter-yearly';
  readonly facilityGuid: string;
  readonly meterGuid: string;
}
export interface VisualizationCaptureOrigin {
  readonly source: VisualizationCaptureSource;
  readonly baseline: unknown;
  /** A partial transfer must never activate an origin by coincident GUIDs. */
  readonly unresolved?: boolean;
}

export function captureSourceMatches(source: VisualizationCaptureSource, definition: VisualizationDefinition): boolean {
  return !!source && ['meter-monthly', 'meter-monthly-patterns', 'meter-yearly'].includes(source.kind)
    && typeof source.facilityGuid === 'string' && !!source.facilityGuid.trim() && typeof source.meterGuid === 'string' && !!source.meterGuid.trim()
    && definition.chart?.kind === (source.kind === 'meter-monthly-patterns' ? 'monthly-patterns' : 'time-series')
    && (definition.chart?.kind !== 'time-series' || definition.chart.interval === (source.kind === 'meter-yearly' ? 'yearly' : 'monthly'))
    && definition.facilitySelection.kind === 'fixed' && definition.facilitySelection.facilityGuids.length === 1
    && definition.facilitySelection.facilityGuids[0] === source.facilityGuid && definition.sources.length > 0
    && definition.sources.every(item => item.kind === 'utility' && item.dataMode === 'calendarized' && item.selectionMode === 'meter'
      && item.selection?.kind === 'fixed' && item.selection.resource === 'meter' && item.selection.guids.length === 1 && item.selection.guids[0] === source.meterGuid);
}

export function createCaptureOrigin(source: VisualizationCaptureSource, definition: VisualizationDefinition): VisualizationCaptureOrigin {
  if (!captureSourceMatches(source, definition)) throw new Error('The capture source does not match this chart.');
  return { source: structuredClone(source), baseline: serializeVisualizationDefinition(normalizeVisualizationDefinition(definition)) };
}

/** Name is library metadata; every other saved chart choice participates in equality. */
export function unchangedCaptureSource(record: Readonly<IdbSavedVisualization> | undefined, definition: VisualizationDefinition | undefined,
  snapshot: AccountWorkspaceSnapshot | undefined): VisualizationCaptureSource | undefined {
  const origin = record?.captureOrigin;
  if (!origin || origin.unresolved || !definition || !snapshot || record.accountId !== snapshot.account.guid
    || definition.accountGuid !== record.accountId || record.preservation?.locked || record.preservation?.references.length) return undefined;
  try {
    const baseline = decodeVisualizationDefinition(origin.baseline);
    if (baseline.state !== 'valid' || !captureSourceMatches(origin.source, baseline.definition)
      || baseline.definition.accountGuid !== record.accountId) return undefined;
    const intent = (value: VisualizationDefinition) => {
      const normalized = normalizeVisualizationDefinition(value);
      if (normalized.chart?.kind === 'monthly-patterns') {
        const years = Object.fromEntries(Object.entries(normalized.chart.yearOverrides ?? {}).map(([year, style]) => [year, {
          ...style, visible: style.visible !== false, lineStyle: style.lineStyle ?? 'solid' }]).filter(([, style]) => {
          const entry = style as { label?: string; color?: string; visible: boolean; lineStyle: string };
          return entry.label !== undefined || entry.color !== undefined || !entry.visible || entry.lineStyle !== 'solid';
        }));
        const { name: _name, ...rest } = serializeVisualizationDefinition({ ...normalized, chart: { ...normalized.chart, smoothLines: normalized.chart.smoothLines === true, yearOverrides: years } });
        return rest;
      }
      const intent = normalized.chart?.kind === 'time-series' ? { ...normalized, chart: { ...normalized.chart, yearToDate: normalized.chart.yearToDate === true, smoothLines: normalized.chart.smoothLines === true } } : normalized;
      const { name: _name, ...rest } = serializeVisualizationDefinition(intent); return rest;
    };
    if (!sameJson(intent(definition), intent(baseline.definition))) return undefined;
    const source = origin.source;
    return snapshot.facilities.some(item => item.guid === source.facilityGuid && item.accountId === record.accountId)
      && snapshot.meters.some(item => item.guid === source.meterGuid && item.facilityId === source.facilityGuid && item.accountId === record.accountId)
      ? source : undefined;
  } catch { return undefined; }
}

function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameJson(a[key], b[key]));
}
