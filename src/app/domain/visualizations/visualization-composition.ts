import { civilMonthIndex, civilMonthRange } from './visualization-periods';
import type { VisualizationChart, VisualizationDefinition, VisualizationHierarchyLevel } from './visualization-definition';
import type { VisualizationData, VisualizationObservation } from './visualization-source-provider';

export type CompositionChart = Extract<VisualizationChart, { kind: 'breakdown' | 'treemap' | 'sunburst' | 'sankey' }>;
export interface CompositionCategory { readonly id: string; readonly label: string; readonly color?: string; }
export interface CompositionContribution {
  /** Canonical occurrence identity, independent of its hierarchy path. */
  readonly id: string;
  readonly seriesId: string;
  readonly label: string;
  readonly observation: VisualizationObservation;
  readonly categories: Partial<Readonly<Record<VisualizationHierarchyLevel, CompositionCategory>>>;
  readonly details: readonly string[];
}
export interface CompositionDenominator {
  readonly kind: 'facility' | 'account' | 'metered-consumption';
  readonly facilityGuid?: string;
  readonly observation: VisualizationObservation;
}
export interface VisualizationCompositionEvidence {
  readonly contributions: readonly CompositionContribution[];
  readonly denominators: readonly CompositionDenominator[];
  readonly diagnostics: readonly string[];
  /** Positive residuals only; negative and unavailable balances remain diagnostics. */
  readonly residuals?: readonly CompositionContribution[];
}
export interface CompositionNode {
  readonly id: string;
  readonly parentId?: string;
  readonly label: string;
  readonly observation: VisualizationObservation;
  readonly contributions: readonly CompositionContribution[];
  readonly color?: string;
}
export interface CompositionPreset { readonly label: string; readonly levels: readonly VisualizationHierarchyLevel[]; }
export function isCompositionChart(chart: VisualizationChart | undefined): chart is CompositionChart {
  return !!chart && ['breakdown', 'treemap', 'sunburst', 'sankey'].includes(chart.kind);
}
export function initializeCompositionChart(chart: VisualizationChart, sourceKind: string, singleFacility = false): VisualizationChart {
  return (chart.kind === 'treemap' || chart.kind === 'sunburst') && !chart.hierarchy.length
    ? { ...chart, hierarchy: compositionPresets(sourceKind === 'utility' ? 'utility' : 'energy-use', singleFacility)[0].levels } : chart;
}
export function compositionPresets(kind: 'utility' | 'energy-use', singleFacility = false): readonly CompositionPreset[] {
  const presets: CompositionPreset[] = kind === 'utility' ? [
    { label: 'Facility / source / meter', levels: ['facility', 'source', 'meter'] },
    { label: 'Facility / meter group / meter', levels: ['facility', 'group', 'meter'] },
    { label: 'Source / facility / meter', levels: ['source', 'facility', 'meter'] }
  ] : [
    { label: 'Facility / group / equipment', levels: ['facility', 'group', 'equipment'] },
    { label: 'Facility / source / equipment', levels: ['facility', 'source', 'equipment'] },
    { label: 'Source / facility / group / equipment', levels: ['source', 'facility', 'group', 'equipment'] }
  ];
  return presets.map(preset => ({ ...preset, ...(singleFacility ? {
    label: preset.label.replace('Facility / ', '').replace(' / facility', ''), levels: preset.levels.filter(level => level !== 'facility')
  } : {}) }));
}
export function compositionPeriodIssue(definition: Pick<VisualizationDefinition, 'sources' | 'period' | 'comparison'>): string | undefined {
  if (definition.comparison.kind !== 'none') return 'Composition charts use one period without comparison.';
  if (definition.sources.some(source => source.kind === 'energy-use') && !['latest-saved-year', 'fiscal-year'].includes(definition.period.kind))
    return 'Energy Use composition requires latest saved fiscal year or one pinned fiscal year; annual snapshots cannot be summed.';
  if (definition.sources.some(source => source.kind === 'utility') && definition.period.kind === 'fixed'
    && (!definition.period.start.endsWith('-01') || definition.period.end !== civilMonthRange(civilMonthIndex(definition.period.end)).end))
    return 'Utility composition requires whole months; amounts are not prorated.';
  return undefined;
}
/** Known-value sums retain missingness and provenance, including observed zero. */
export function sumCompositionObservations(values: readonly VisualizationObservation[]): VisualizationObservation {
  const known = values.filter((value): value is Extract<VisualizationObservation, { state: 'observed' }> => value.state === 'observed');
  const total = known.reduce((sum, value) => sum + value.value, 0);
  if (!known.length || !Number.isFinite(total)) return { state: 'missing', value: null,
    reason: !Number.isFinite(total) ? 'The combined amount is nonfinite.' : values.map(value => value.state === 'observed' ? '' : value.reason).filter(Boolean).join('; ') || 'No saved contributions.' };
  return { state: 'observed', value: total, partial: known.length !== values.length || known.some(value => value.partial),
    provenance: known.some(value => value.provenance === 'carried-forward') ? 'carried-forward' : known[0].provenance,
    notes: [...new Set(values.flatMap(value => value.state === 'observed' ? value.notes ?? [] : [value.reason]))] };
}
/** Every parent is derived from leaves. Parent summaries never become extra contributions. */
export function compositionHierarchy(contributions: readonly CompositionContribution[], levels: readonly VisualizationHierarchyLevel[]): CompositionNode[] {
  const buckets = new Map<string, { id: string; parentId?: string; label: string; color?: string; contributions: CompositionContribution[] }>();
  for (const contribution of contributions) {
    let parentId: string | undefined;
    for (const level of levels) {
      const category = contribution.categories[level]; if (!category) continue;
      const id = JSON.stringify([parentId ?? '', level, category.id]);
      const node = buckets.get(id) ?? { id, parentId, label: category.label, color: category.color, contributions: [] };
      node.contributions.push(contribution); buckets.set(id, node); parentId = id;
    }
  }
  return [...buckets.values()].map(node => ({ ...node, observation: sumCompositionObservations(node.contributions.map(value => value.observation)) }));
}
/** Provides the declared shape while retaining original leaf evidence for all presenters. */
export function compositionData(chart: CompositionChart, evidence: VisualizationCompositionEvidence): VisualizationData {
  if (chart.kind === 'breakdown') {
    const buckets = new Map<string, CompositionContribution[]>();
    for (const contribution of evidence.contributions) { const bucket = buckets.get(contribution.seriesId) ?? []; bucket.push(contribution); buckets.set(contribution.seriesId, bucket); }
    return { kind: 'breakdown', items: [...buckets].map(([id, values]) => ({ id, label: values[0].label, observation: sumCompositionObservations(values.map(value => value.observation)) })) };
  }
  if (chart.kind === 'treemap' || chart.kind === 'sunburst') return { kind: 'hierarchy', nodes: compositionHierarchy(evidence.contributions, chart.hierarchy) };
  const nodes = new Map<string, { id: string; label: string }>();
  const buckets = new Map<string, { source: string; target: string; values: VisualizationObservation[] }>();
  for (const contribution of [...evidence.contributions, ...evidence.residuals ?? []]) {
    const facility = contribution.categories.facility, category = contribution.categories.source;
    const targetCategory = chart.flow === 'source-to-equipment' ? contribution.categories.equipment : contribution.categories.group;
    if (!category || !targetCategory) continue;
    const source = JSON.stringify(['source', facility?.id, category.id]), target = JSON.stringify(['target', facility?.id, targetCategory.id]);
    nodes.set(source, { id: source, label: `${facility?.label ? facility.label + ' / ' : ''}${category.label}` });
    nodes.set(target, { id: target, label: `${facility?.label ? facility.label + ' / ' : ''}${targetCategory.label}` });
    const key = JSON.stringify([source, target]), bucket = buckets.get(key) ?? { source, target, values: [] };
    bucket.values.push(contribution.observation); buckets.set(key, bucket);
  }
  return { kind: 'flow', nodes: [...nodes.values()], links: [...buckets.values()].map(({ values, ...link }) => ({ ...link, observation: sumCompositionObservations(values) })) };
}
