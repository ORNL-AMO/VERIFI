/** Saved intent only. Record identity, revisions, and persistence belong to Vis2. */
export const VISUALIZATION_DEFINITION_VERSION = 1;

export type VisualizationScope =
  | { readonly kind: 'portfolio' }
  | { readonly kind: 'facility'; readonly facilityGuid: string };

export type SettingBinding<T> = { readonly kind: 'owner' } | { readonly kind: 'pinned'; readonly value: T };
export type VisualizationResourceKind = 'facility' | 'meter' | 'meter-group' | 'predictor' | 'equipment' | 'energy-use-group';
export type ResourceSelection =
  | { readonly kind: 'fixed'; readonly resource: VisualizationResourceKind; readonly guids: readonly string[] }
  | { readonly kind: 'rule'; readonly resource: VisualizationResourceKind; readonly filter: {
      readonly facilityGuids?: readonly string[];
      readonly groupGuids?: readonly string[];
      readonly utilitySources?: readonly string[];
      readonly search?: string;
      readonly includeRetired?: boolean;
    } };

export interface VisualizationSourceSettings {
  readonly unit?: SettingBinding<string>;
  readonly energyTreatment?: SettingBinding<'site' | 'source'>;
}

interface SourceBase {
  /** Definition-local identity; never an IndexedDB numeric key. */
  readonly id: string;
  readonly settings?: VisualizationSourceSettings;
}

export interface UtilityVisualizationSource extends SourceBase {
  readonly kind: 'utility';
  readonly measure: 'energy' | 'consumption' | 'cost' | 'location-emissions' | 'market-emissions' | 'charge';
  readonly selection?: ResourceSelection;
  readonly aggregation: 'none' | 'sum';
  readonly dataMode: 'billing-period' | 'calendarized';
  readonly groupBy: 'total' | 'facility' | 'group' | 'meter' | 'source';
  readonly charge?: { readonly meterGuid: string; readonly chargeGuid: string; readonly measure: 'cost' | 'usage' };
}

export interface PredictorVisualizationSource extends SourceBase {
  readonly kind: 'predictor' | 'weather';
  readonly measure: 'value';
  readonly selection?: ResourceSelection;
  readonly aggregation: 'none' | 'sum' | 'mean';
}

export interface EnergyUseVisualizationSource extends SourceBase {
  readonly kind: 'energy-use';
  readonly measure: 'consumption' | 'cost' | 'emissions' | 'balance';
  readonly selection?: ResourceSelection;
  readonly aggregation: 'none' | 'sum';
  readonly denominator: 'selected' | 'facility' | 'account' | 'metered-consumption';
}

export interface AnalysisResultVisualizationSource extends SourceBase {
  readonly kind: 'analysis-result';
  readonly analysisGuid?: string;
  readonly groupGuid?: string;
  readonly measure: 'actual' | 'calculated' | 'savings' | 'losses' | 'annual-improvement' | 'total-improvement' | 'banked-savings' | 'banked-losses';
  readonly aggregation: 'none';
}

export interface AnalysisModelVisualizationSource extends SourceBase {
  readonly kind: 'analysis-model';
  readonly analysisGuid?: string;
  readonly groupGuid?: string;
  /** Saved model identity, never an unsaved candidate or a fallback to selectedModelId. */
  readonly modelId?: string;
  readonly comparisonModelId?: string;
  readonly measure: 'actual' | 'modeled' | 'residual';
  readonly aggregation: 'none';
}

export type VisualizationSource = UtilityVisualizationSource | PredictorVisualizationSource | EnergyUseVisualizationSource
  | AnalysisResultVisualizationSource | AnalysisModelVisualizationSource;
export type VisualizationSourceKind = VisualizationSource['kind'];

/** Civil ISO dates are inclusive at both ends; adapters resolve their native periods explicitly. */
export type VisualizationPeriod =
  | { readonly kind: 'all-history' }
  | { readonly kind: 'fixed'; readonly start: string; readonly end: string; readonly basis: 'calendar' | 'fiscal' }
  | { readonly kind: 'rolling'; readonly count: number; readonly unit: 'month' | 'year'; readonly anchor: 'latest-data' | 'calendar';
      readonly basis: 'calendar' | 'fiscal'; readonly includeIncomplete: boolean }
  | { readonly kind: 'latest-saved-year'; readonly basis: 'fiscal' }
  | { readonly kind: 'fiscal-year'; readonly year: number };

export type VisualizationComparison =
  | { readonly kind: 'none' }
  | { readonly kind: 'previous-period' }
  | { readonly kind: 'previous-year'; readonly basis: 'calendar' | 'fiscal' }
  | { readonly kind: 'custom'; readonly start: string; readonly end: string };

export interface VisualizationSeries {
  readonly id: string;
  readonly sourceId: string;
  readonly metric: string;
  readonly resourceGuid?: string;
  readonly label?: string;
  readonly color?: string;
  readonly axis: 'left' | 'right';
  readonly lineStyle?: 'solid' | 'dashed' | 'dotted';
}

export type VisualizationChart =
  | { readonly kind: 'time-series'; readonly type: 'line' | 'bar' | 'area' | 'combination'; readonly interval: 'monthly' | 'yearly' | 'native';
      readonly stack: 'none' | 'absolute' | 'percent'; readonly seriesTypes?: readonly { readonly seriesId: string; readonly type: 'line' | 'bar' | 'area' }[] }
  | { readonly kind: 'scatter'; readonly xSeriesId?: string; readonly ySeriesId?: string; readonly showFit: boolean }
  | { readonly kind: 'correlation'; readonly statistic: 'r' | 'r-squared'; readonly scale: 'raw' | 'z-score' }
  | { readonly kind: 'heatmap'; readonly dimension: 'month-year' | 'series-period'; readonly scale: 'linear' | 'diverging' }
  | { readonly kind: 'breakdown'; readonly type: 'bar' | 'donut'; readonly values: 'absolute' | 'percent' }
  | { readonly kind: 'treemap'; readonly hierarchy: readonly ('facility' | 'group' | 'source' | 'equipment')[]; readonly values: 'absolute' | 'percent' }
  | { readonly kind: 'sankey'; readonly flow: 'source-to-equipment' | 'source-to-group' | 'energy-balance' };

export interface VisualizationDefinition {
  readonly version: typeof VISUALIZATION_DEFINITION_VERSION;
  readonly name: string;
  readonly accountGuid: string;
  readonly scope: VisualizationScope;
  readonly sources: readonly VisualizationSource[];
  readonly period: VisualizationPeriod;
  readonly comparison: VisualizationComparison;
  /** Order is persisted display order. No generated row arrays or chart instances. */
  readonly series: readonly VisualizationSeries[];
  readonly chart?: VisualizationChart;
  readonly appearance: { readonly legend: boolean; readonly title?: string };
}

/** Creation commits coherent but incomplete intent; source discovery belongs to the workbench. */
export function createVisualizationDefinition(name: string, accountGuid: string, scope: VisualizationScope,
  sourceKind: VisualizationSourceKind): VisualizationDefinition {
  const base = { id: 'source-1', settings: { unit: { kind: 'owner' as const } } };
  const source: VisualizationSource = sourceKind === 'utility'
    ? { ...base, kind: 'utility', measure: 'energy', aggregation: 'sum', dataMode: 'calendarized', groupBy: 'meter',
      settings: { ...base.settings, energyTreatment: { kind: 'owner' } } }
    : sourceKind === 'energy-use' ? { ...base, kind: 'energy-use', measure: 'consumption', aggregation: 'sum', denominator: 'facility' }
    : sourceKind === 'analysis-result' ? { ...base, kind: 'analysis-result', measure: 'actual', aggregation: 'none' }
    : sourceKind === 'analysis-model' ? { ...base, kind: 'analysis-model', measure: 'modeled', aggregation: 'none' }
    : { ...base, kind: sourceKind, measure: 'value', aggregation: 'none' };
  return { version: VISUALIZATION_DEFINITION_VERSION, name, accountGuid, scope: { ...scope }, sources: [source],
    period: sourceKind === 'energy-use' ? { kind: 'latest-saved-year', basis: 'fiscal' } : { kind: 'all-history' },
    comparison: { kind: 'none' }, series: [], appearance: { legend: true } };
}

/** A setup choice describes intent without claiming source compatibility or runtime availability. */
export interface VisualizationSetupInput {
  readonly name: string;
  readonly accountGuid: string;
  readonly scope: VisualizationScope;
  readonly chart: VisualizationChart;
  readonly sourceKinds: readonly VisualizationSourceKind[];
}

/** Every selected family starts independently; the workbench assigns actual resources and series. */
export function createVisualizationSetupDefinition(input: VisualizationSetupInput): VisualizationDefinition {
  if (!input.sourceKinds.length || new Set(input.sourceKinds).size !== input.sourceKinds.length)
    throw new Error('Choose one or more unique source families.');
  const sources = input.sourceKinds.map((kind, index) => ({
    ...createVisualizationDefinition(input.name, input.accountGuid, input.scope, kind).sources[0], id: `source-${index + 1}`
  }));
  return { version: VISUALIZATION_DEFINITION_VERSION, name: input.name, accountGuid: input.accountGuid,
    scope: { ...input.scope }, sources, chart: structuredClone(input.chart),
    period: input.sourceKinds.length === 1 && input.sourceKinds[0] === 'energy-use'
      ? { kind: 'latest-saved-year', basis: 'fiscal' } : { kind: 'all-history' },
    comparison: { kind: 'none' }, series: [], appearance: { legend: true } };
}
