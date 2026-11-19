import { initializeCompositionChart } from './visualization-composition';
import type { EquipmentType } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { expandVisualizationDefinition, serializeVisualizationDefinition } from './visualization-source-groups';
import type { ReportingAnalysisBinding } from '../home/home-dashboard';

/** Saved intent only. Record identity, revisions, and persistence belong to Vis2. */
export const VISUALIZATION_DEFINITION_VERSION = 3;

export type VisualizationFacilitySelection =
  | { readonly kind: 'all' }
  | { readonly kind: 'fixed'; readonly facilityGuids: readonly string[] };

/** Runtime ownership and an explicit eligibility boundary; an empty list means no facilities. */
export type VisualizationScope =
  | { readonly kind: 'portfolio'; readonly facilityGuids: readonly string[] }
  | { readonly kind: 'facility'; readonly facilityGuid: string; readonly facilityGuids: readonly string[] };

export type VisualizationTraceType = 'line' | 'bar' | 'area';
export type UtilitySelectionMode = 'source' | 'group' | 'meter' | 'facility' | 'rule';
export type EnergyUseSelectionMode = 'group' | 'equipment' | 'equipment-type' | 'linked-meter-group' | 'facility';

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
  /** Compiled runtime display units. Durable source groups omit provider settings. */
  readonly quantityUnits?: Readonly<Record<string, string>>;
  readonly unit?: SettingBinding<string>;
  readonly energyTreatment?: SettingBinding<'site' | 'source'>;
}

/** Chart-wide display intent; quantity keys are the existing converter's measure names. */
export interface VisualizationDisplaySettings {
  readonly units?: Readonly<Record<string, SettingBinding<string>>>;
  readonly energyTreatment?: SettingBinding<'site' | 'source'>;
}

interface SourceBase {
  /** Definition-local identity; never an IndexedDB numeric key. */
  readonly id: string;
  readonly settings?: VisualizationSourceSettings;
}

export interface UtilityVisualizationSource extends SourceBase {
  readonly kind: 'utility';
  readonly selectionMode?: UtilitySelectionMode;
  readonly measure: 'energy' | 'consumption' | 'cost' | 'location-emissions' | 'market-emissions' | 'charge';
  readonly selection?: ResourceSelection;
  readonly aggregation: 'none' | 'sum';
  readonly dataMode: 'billing-period' | 'calendarized';
  readonly groupBy: 'total' | 'facility' | 'group' | 'meter' | 'source';
  readonly charge?: { readonly meterGuid: string; readonly chargeGuid: string; readonly measure: 'cost' | 'usage' };
}

export interface PredictorVisualizationSource extends SourceBase {
  /** Standard/weather identity belongs to selected predictor records, not this source category. */
  readonly kind: 'predictor';
  readonly measure: 'value';
  readonly selection?: ResourceSelection;
  readonly aggregation: 'none' | 'sum' | 'mean';
}

export interface EnergyUseVisualizationSource extends SourceBase {
  readonly kind: 'energy-use';
  readonly selectionMode?: EnergyUseSelectionMode;
  /** Named categories, not resource GUIDs. */
  readonly equipmentTypes?: readonly EquipmentType[];
  readonly measure: 'consumption' | 'cost' | 'emissions' | 'balance';
  readonly selection?: ResourceSelection;
  readonly aggregation: 'none' | 'sum';
  readonly denominator: 'selected' | 'facility' | 'account' | 'metered-consumption';
}

export interface AnalysisResultVisualizationSource extends SourceBase {
  readonly kind: 'analysis';
  readonly mode: 'result';
  readonly analysisGuid?: string;
  /** Explicit saved rule, mutually exclusive with exact analysis/group identities. Runtime resolution is Home4. */
  readonly reporting?: ReportingAnalysisBinding;
  readonly groupGuid?: string;
  readonly measure: 'actual' | 'calculated' | 'savings' | 'losses' | 'annual-improvement' | 'total-improvement' | 'banked-savings' | 'banked-losses';
  readonly aggregation: 'none';
}

export interface AnalysisModelVisualizationSource extends SourceBase {
  readonly kind: 'analysis';
  readonly mode: 'model';
  readonly analysisGuid?: string;
  readonly groupGuid?: string;
  /** Saved model identity, never an unsaved candidate or a fallback to selectedModelId. */
  readonly modelId?: string;
  readonly comparisonModelId?: string;
  readonly measure: 'actual' | 'modeled' | 'residual';
  readonly aggregation: 'none';
}

export type AnalysisVisualizationSource = AnalysisResultVisualizationSource | AnalysisModelVisualizationSource;
export type VisualizationSource = UtilityVisualizationSource | PredictorVisualizationSource | EnergyUseVisualizationSource | AnalysisVisualizationSource;
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

/** Presentation only. A provider-local category identity is never a domain reference. */
export type VisualizationSeriesOverride = (
  | { readonly resourceGuid: string; readonly seriesId?: never }
  | { readonly seriesId: string; readonly resourceGuid?: never }
) & {
  /** Omitted means the definition owner; retained on cross-account transfers with no mapping. */
  readonly accountGuid?: string;
  readonly label?: string;
  readonly color?: string;
  readonly traceType?: VisualizationTraceType;
  readonly axis?: 'left' | 'right';
  readonly lineStyle?: 'solid' | 'dashed' | 'dotted';
  readonly visible?: boolean;
  /** Explicit position; appearance changes alone never reorder matching members. */
  readonly order?: number;
};

export interface VisualizationSeries {
  readonly id: string;
  readonly sourceId: string;
  readonly metric: string;
  readonly resourceGuid?: string;
  readonly label?: string;
  readonly color?: string;
  readonly traceType?: VisualizationTraceType;
  readonly axis: 'left' | 'right';
  readonly lineStyle?: 'solid' | 'dashed' | 'dotted';
  readonly visible?: boolean;
  /** Only an override's explicit order changes member ordering; new matches retain provider order. */
  readonly overrides?: readonly VisualizationSeriesOverride[];
}

/** An expanded observation series, qualified by its saved source. */
export type VisualizationSeriesSelector = { readonly sourceId: string } & (
  { readonly resourceGuid: string; readonly seriesId?: never } | { readonly seriesId: string; readonly resourceGuid?: never });
export interface VisualizationExplorationSettings {
  readonly interval?: 'monthly' | 'yearly';
}
export interface VisualizationPairSettings extends VisualizationExplorationSettings {
  readonly grouping?: 'none' | 'year' | 'month';
  readonly scale?: 'raw' | 'z-score';
}

export type VisualizationHierarchyLevel = 'facility' | 'group' | 'source' | 'equipment' | 'meter';

export interface MonthlyPatternYearStyle {
  readonly label?: string;
  readonly color?: string;
  readonly lineStyle?: 'solid' | 'dashed' | 'dotted';
  readonly visible?: boolean;
}

export type VisualizationChart =
  | { readonly kind: 'monthly-patterns'; readonly smoothLines?: boolean; readonly yearOverrides?: Readonly<Record<string, MonthlyPatternYearStyle>> }
  | { readonly kind: 'time-series'; readonly defaultTraceType: VisualizationTraceType; readonly interval: 'monthly' | 'yearly' | 'native';
      readonly stack: 'none' | 'absolute' | 'percent'; readonly smoothLines?: boolean; readonly yearToDate?: boolean }
  | (VisualizationPairSettings & { readonly kind: 'scatter'; readonly xSeriesId?: string; readonly ySeriesId?: string; readonly x?: VisualizationSeriesSelector; readonly y?: VisualizationSeriesSelector; readonly showFit: boolean })
  | (VisualizationPairSettings & { readonly kind: 'correlation'; readonly statistic: 'r' | 'r-squared'; readonly scale: 'raw' | 'z-score'; readonly view?: 'pairs' | 'matrix'; readonly showFit?: boolean })
  | (VisualizationExplorationSettings & { readonly kind: 'heatmap'; readonly dimension: 'month-year' | 'series-period'; readonly scale: 'linear' | 'diverging'; readonly normalization?: 'raw' | 'z-score' })
  | { readonly kind: 'breakdown'; readonly type: 'bar' | 'donut'; readonly values: 'absolute' | 'percent' }
  | { readonly kind: 'treemap'; readonly hierarchy: readonly VisualizationHierarchyLevel[]; readonly values: 'absolute' | 'percent' }
  | { readonly kind: 'sunburst'; readonly hierarchy: readonly VisualizationHierarchyLevel[]; readonly values: 'absolute' | 'percent' }
  | { readonly kind: 'sankey'; readonly flow: 'source-to-equipment' | 'source-to-group' | 'energy-balance' };

export interface VisualizationDefinition {
  readonly version: typeof VISUALIZATION_DEFINITION_VERSION;
  readonly name: string;
  readonly accountGuid: string;
  readonly facilitySelection: VisualizationFacilitySelection;
  readonly sources: readonly VisualizationSource[];
  readonly period: VisualizationPeriod;
  readonly comparison: VisualizationComparison;
  /** Order is persisted display order. No generated row arrays or chart instances. */
  readonly series: readonly VisualizationSeries[];
  readonly chart?: VisualizationChart;
  readonly appearance: { readonly legend: boolean; readonly title?: string };
  readonly displaySettings?: VisualizationDisplaySettings;
}

/** Creation commits coherent but incomplete intent; source discovery belongs to the workbench. */
export function createVisualizationDefinition(name: string, accountGuid: string, facilitySelection: VisualizationFacilitySelection,
  sourceKind: VisualizationSourceKind): VisualizationDefinition {
  const base = { id: 'source-1', settings: { unit: { kind: 'owner' as const } } };
  const source: VisualizationSource = sourceKind === 'utility'
    ? { ...base, kind: 'utility', measure: 'energy', aggregation: 'sum', dataMode: 'calendarized', groupBy: 'meter',
      settings: { ...base.settings, energyTreatment: { kind: 'owner' } } }
    : sourceKind === 'energy-use' ? { ...base, kind: 'energy-use', measure: 'consumption', aggregation: 'sum', denominator: 'facility' }
    : sourceKind === 'analysis' ? { ...base, kind: 'analysis', mode: 'result', measure: 'actual', aggregation: 'none' }
    : { ...base, kind: sourceKind, measure: 'value', aggregation: 'none' };
  return { version: VISUALIZATION_DEFINITION_VERSION, name, accountGuid, facilitySelection: structuredClone(facilitySelection), sources: [source],
    period: sourceKind === 'energy-use' ? { kind: 'latest-saved-year', basis: 'fiscal' } : { kind: 'all-history' },
    comparison: { kind: 'none' }, series: [], appearance: { legend: true } };
}

/** A setup choice describes intent without claiming source compatibility or runtime availability. */
export interface VisualizationSetupInput {
  readonly name: string;
  readonly accountGuid: string;
  readonly facilitySelection: VisualizationFacilitySelection;
  readonly chart: VisualizationChart;
  readonly sourceKinds: readonly VisualizationSourceKind[];
}

/** Every selected data source starts independently; the workbench assigns actual resources and series. */
export function createVisualizationSetupDefinition(input: VisualizationSetupInput): VisualizationDefinition {
  if (!input.sourceKinds.length || new Set(input.sourceKinds).size !== input.sourceKinds.length)
    throw new Error('Choose one or more unique data sources.');
  const sources = input.sourceKinds.map((kind, index) => ({
    ...createVisualizationDefinition(input.name, input.accountGuid, input.facilitySelection, kind).sources[0], id: `source-${index + 1}`
  }));
  return { version: VISUALIZATION_DEFINITION_VERSION, name: input.name, accountGuid: input.accountGuid,
    facilitySelection: structuredClone(input.facilitySelection), sources, chart: structuredClone(input.sourceKinds.length === 1 && input.sourceKinds[0] === 'energy-use' && ['scatter', 'correlation', 'heatmap'].includes(input.chart.kind)
      ? { ...input.chart, interval: 'yearly', ...(input.chart.kind === 'heatmap' ? { dimension: 'series-period' } : {}) } as VisualizationChart : initializeCompositionChart(input.chart, input.sourceKinds[0], input.facilitySelection.kind === 'fixed' && input.facilitySelection.facilityGuids.length === 1)),
    period: !['scatter', 'correlation', 'heatmap'].includes(input.chart.kind) && input.sourceKinds.length === 1 && input.sourceKinds[0] === 'energy-use'
      ? { kind: 'latest-saved-year', basis: 'fiscal' } : { kind: 'all-history' },
    comparison: { kind: 'none' }, series: [], appearance: { legend: true } };
}

/** Coherent metadata and set-valued inclusion compare independently of raw editor text. */
export function normalizeVisualizationDefinition(value: VisualizationDefinition): VisualizationDefinition {
  value = expandVisualizationDefinition(serializeVisualizationDefinition(value)) as VisualizationDefinition;
  const title = value.appearance.title?.trim();
  return { ...structuredClone(value), name: value.name.trim(),
    facilitySelection: value.facilitySelection.kind === 'fixed'
      ? { kind: 'fixed', facilityGuids: [...value.facilitySelection.facilityGuids].sort() } : { kind: 'all' },
    appearance: { legend: value.appearance.legend, ...(title ? { title } : {}) } };
}
