import type { VisualizationDefinition, VisualizationPeriod, VisualizationScope } from './visualization-definition';
import { decodeVisualizationDefinition } from './visualization-validation';
import { CHART_CAPABILITIES, checkVisualizationCompatibility } from './visualization-capabilities';
import type { VisualizationSourceEvidence } from './visualization-source-provider';

export const REQUIRED_CAPTURE_ASPECTS = ['sources', 'filters', 'aggregation', 'settings', 'series', 'periods', 'appearance', 'chart-settings'] as const;
export interface VisualizationCaptureFidelity {
  readonly sourceIdentities: 'durable' | 'unsaved';
  readonly preserved: readonly (typeof REQUIRED_CAPTURE_ASPECTS)[number][];
  readonly omissions: readonly string[];
}
export type VisualizationCaptureResult =
  | { readonly state: 'supported'; readonly definition: VisualizationDefinition }
  | { readonly state: 'unsupported'; readonly reasons: readonly string[] };

/** A feature adapter supplies a definition and fidelity evidence, never an ECharts option snapshot. */
export function captureVisualizationDefinition(value: unknown, evidence: readonly VisualizationSourceEvidence[],
  fidelity: VisualizationCaptureFidelity): VisualizationCaptureResult {
  const validation = decodeVisualizationDefinition(value);
  const reasons: string[] = [];
  if (fidelity.sourceIdentities !== 'durable') reasons.push('Save source/model identities before capturing this chart.');
  if (fidelity.omissions.length || REQUIRED_CAPTURE_ASPECTS.some(aspect => !fidelity.preserved.includes(aspect)))
    reasons.push('This adapter cannot preserve all meaningful chart settings.');
  if (validation.state !== 'valid') reasons.push(...validation.issues.map(issue => issue.message));
  if (validation.state === 'valid') {
    const compatible = checkVisualizationCompatibility(validation.definition, evidence);
    if (compatible.state === 'unavailable') reasons.push(...compatible.reasons.map(reason => reason.message));
    if (!reasons.length) return { state: 'supported', definition: JSON.parse(JSON.stringify(validation.definition)) as VisualizationDefinition };
  }
  return { state: 'unsupported', reasons };
}

export interface VisualizationEmbeddingContext {
  readonly reference: { readonly visualizationGuid: string; readonly accountGuid: string };
  readonly hostAccountGuid: string;
  readonly hostScope: VisualizationScope;
  readonly dashboardPeriod?: VisualizationPeriod;
  /** Presence of override mode is explicit consent to date inheritance. */
  readonly dates?: { readonly kind: 'saved' } | {
    readonly kind: 'override'; readonly followDashboard: boolean; readonly period?: VisualizationPeriod;
  };
  readonly appearance?: { readonly title?: string; readonly legend?: boolean };
}
export type VisualizationEmbeddingResult =
  | { readonly state: 'configured' | 'requires-resolution'; readonly definition: VisualizationDefinition }
  | { readonly state: 'unavailable'; readonly reasons: readonly string[] };

/** Resolves intent only. Changed dates must be resolved again before a consumer renders data. */
export function resolveVisualizationEmbedding(definition: VisualizationDefinition | undefined, context: VisualizationEmbeddingContext,
  evidence: readonly VisualizationSourceEvidence[]): VisualizationEmbeddingResult {
  const reject = (...reasons: string[]): VisualizationEmbeddingResult => ({ state: 'unavailable', reasons });
  if (!definition) return reject('This visualization was deleted or is unavailable. Replace or remove the widget.');
  if (context.hostAccountGuid !== definition.accountGuid || context.reference.accountGuid !== definition.accountGuid)
    return reject('A widget can reference only visualizations in its own account.');
  if (!context.reference.visualizationGuid.trim() || evidence.some(entry => entry.request.identity.definitionGuid !== context.reference.visualizationGuid))
    return reject('Resolve the visualization identity referenced by this widget.');
  if (Object.keys(context).some(key => !['reference', 'hostAccountGuid', 'hostScope', 'dashboardPeriod', 'dates', 'appearance'].includes(key)))
    return reject('Source and scope overrides are not supported.');
  if (context.dates && (Object.keys(context.dates).some(key => !['kind', 'followDashboard', 'period'].includes(key))
    || !['saved', 'override'].includes(context.dates.kind) || context.dates.kind === 'saved' && Object.keys(context.dates).length !== 1
    || context.dates.kind === 'override' && typeof context.dates.followDashboard !== 'boolean'))
    return reject('Choose an explicit saved-date or supported override mode.');
  const selectedPeriod = context.dates?.kind === 'override'
    ? context.dates.period ?? (context.dates.followDashboard ? context.dashboardPeriod : undefined) : undefined;
  if (context.dates?.kind === 'override' && context.dates.followDashboard && !selectedPeriod)
    return reject('Choose dashboard dates before enabling date inheritance.');
  const candidate: VisualizationDefinition = { ...definition, period: selectedPeriod ?? definition.period,
    appearance: { ...definition.appearance, ...context.appearance } };
  const validation = decodeVisualizationDefinition(candidate);
  if (validation.state !== 'valid') return reject(...validation.issues.map(issue => issue.message));
  if (selectedPeriod) {
    if (!CHART_CAPABILITIES[candidate.chart!.kind].allowDateOverride || evidence.length !== candidate.sources.length
      || evidence.some(entry => !entry.capabilities.allowDateOverride || !entry.capabilities.periods.includes(selectedPeriod.kind)))
      return reject('This visualization does not support the requested date override.');
  }
  const compatibility = checkVisualizationCompatibility(candidate, evidence);
  if (compatibility.state === 'unavailable') {
    if (selectedPeriod && compatibility.reasons.every(reason => reason.code === 'stale' || reason.code === 'series'))
      return { state: 'requires-resolution', definition: JSON.parse(JSON.stringify(candidate)) as VisualizationDefinition };
    return reject(...compatibility.reasons.map(reason => reason.message));
  }
  return { state: 'configured', definition: JSON.parse(JSON.stringify(candidate)) as VisualizationDefinition };
}
