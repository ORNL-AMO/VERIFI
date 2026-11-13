import type {
  VisualizationChart, VisualizationComparison, VisualizationPeriod, VisualizationResourceKind,
  VisualizationScope, VisualizationSeries, VisualizationSource, VisualizationSourceKind
} from './visualization-definition';

export type VisualizationChartKind = VisualizationChart['kind'];
export type VisualizationDataShape = VisualizationData['kind'];
export type VisualizationControl = 'series' | 'appearance' | 'axes' | 'stacking' | 'fit' | 'normalization' | 'hierarchy' | 'denominator';
export type VisualizationAlignment = 'civil-month' | 'civil-year' | 'billing-occurrence' | 'fiscal-interval'
  | 'provider-paired' | 'provider-matrix' | 'category' | 'hierarchy' | 'flow';

/** A descriptor is a promise made by a feature adapter, not inferred from ECharts support. */
export interface VisualizationSourceCapabilities {
  readonly kind: VisualizationSourceKind;
  readonly measures: readonly VisualizationSource['measure'][];
  readonly aggregations: readonly VisualizationSource['aggregation'][];
  readonly periods: readonly VisualizationPeriod['kind'][];
  readonly comparisons: readonly VisualizationComparison['kind'][];
  readonly chartKinds: readonly VisualizationChartKind[];
  readonly shapes: readonly VisualizationDataShape[];
  readonly alignments: readonly VisualizationAlignment[];
  readonly settings: readonly ('unit' | 'energyTreatment')[];
  readonly controls: readonly VisualizationControl[];
  readonly allowDateOverride: boolean;
}

export interface VisualizationRequestIdentity {
  readonly accountGuid: string;
  readonly workspaceRevision: number;
  readonly definitionGuid: string;
  readonly definitionRevision: number;
  /** Shared preview/embedding request identity; sourceId distinguishes participating requests. */
  readonly requestId: string;
  readonly scope: VisualizationScope;
  readonly sourceId: string;
}

export interface VisualizationSourceRequest {
  readonly identity: VisualizationRequestIdentity;
  readonly source: VisualizationSource;
  readonly chart: VisualizationChart;
  readonly period: VisualizationPeriod;
  readonly comparison: VisualizationComparison;
  readonly series: readonly VisualizationSeries[];
  /** Consumer resolves this once across the selected sources; providers must not substitute local clocks/last dates. */
  readonly dateContext: { readonly calendarDate: string; readonly latestDataDate?: string };
}

export type VisualizationProvenance = 'measured' | 'predictor' | 'weather' | 'estimated' | 'carried-forward' | 'modeled' | 'savings';
export type VisualizationObservation =
  | { readonly state: 'observed'; readonly value: number; readonly provenance: VisualizationProvenance; readonly partial: boolean }
  | { readonly state: 'missing' | 'alignment-padding' | 'excluded'; readonly value: null; readonly reason: string };

/** Actual inclusive civil intervals, not just fiscal-year labels. */
export interface ResolvedVisualizationPeriod {
  readonly role: 'primary' | 'comparison';
  readonly start: string;
  readonly end: string;
  readonly basis: 'calendar' | 'fiscal';
  readonly interval: 'billing-period' | 'monthly' | 'yearly';
  readonly facilityGuid?: string;
  readonly fiscalYear?: number;
}

export interface ResolvedVisualizationSeries {
  readonly id: string;
  readonly sourceId: string;
  readonly metric: string;
  readonly resourceGuid?: string;
  readonly label: string;
  readonly unit: string;
  readonly dimension: string;
  readonly currency?: string;
  readonly energyTreatment?: 'site' | 'source';
  /** Only authoritative additive measures may stack or contribute to composition totals. */
  readonly additive: boolean;
  /** Provider-owned identities of underlying contributions, for overlap checks before totals/stacking. */
  readonly contributionKeys?: readonly string[];
}

export interface VisualizationResolvedReference {
  readonly kind: VisualizationResourceKind | 'analysis' | 'analysis-group' | 'model' | 'charge';
  /** Domain GUID, or durable model ID for a model reference; never a local database key. */
  readonly id: string;
  readonly accountGuid: string;
  readonly facilityGuid?: string;
}

export type VisualizationData =
  | { readonly kind: 'time-series'; readonly rows: readonly {
      readonly periodKey: string; readonly start: string; readonly end: string;
      /** Original native dates; absent means primary. Renderers align comparison rows later. */
      readonly role?: 'primary' | 'comparison';
      readonly values: Readonly<Record<string, VisualizationObservation>>;
    }[] }
  | { readonly kind: 'pairs'; readonly pairs: readonly {
      readonly key: string; readonly x: VisualizationObservation; readonly y: VisualizationObservation;
    }[]; readonly excludedPairCount: number }
  | { readonly kind: 'matrix'; readonly cells: readonly {
      /** Series-period heatmaps use a resolved series ID for row; other matrix axes retain feature-native labels. */
      readonly row: string; readonly column: string; readonly observation: VisualizationObservation;
    }[] }
  | { readonly kind: 'breakdown'; readonly items: readonly {
      readonly id: string; readonly label: string; readonly observation: VisualizationObservation;
    }[] }
  | { readonly kind: 'hierarchy'; readonly nodes: readonly {
      readonly id: string; readonly parentId?: string; readonly label: string; readonly observation: VisualizationObservation;
    }[] }
  | { readonly kind: 'flow'; readonly nodes: readonly { readonly id: string; readonly label: string }[];
      readonly links: readonly { readonly source: string; readonly target: string; readonly observation: VisualizationObservation }[] };

export interface VisualizationResolvedData {
  readonly data: VisualizationData;
  /** Provider-owned observation-key semantics; mixed sources must declare the same alignment. */
  readonly alignment: { readonly kind: VisualizationAlignment; readonly key: string };
  readonly series: readonly ResolvedVisualizationSeries[];
  readonly periods: readonly ResolvedVisualizationPeriod[];
  readonly references: readonly VisualizationResolvedReference[];
  readonly provenance: readonly VisualizationProvenance[];
  readonly quality: { readonly partial: boolean; readonly warnings: readonly string[] };
  readonly analysisFreshness?: 'current' | 'stale';
}

export type VisualizationSourceResolution = { readonly identity: VisualizationRequestIdentity } & (
  | { readonly state: 'ready'; readonly resolved: VisualizationResolvedData }
  | { readonly state: 'empty'; readonly periods: readonly ResolvedVisualizationPeriod[]; readonly message: string }
  | { readonly state: 'loading' | 'waiting'; readonly message: string }
  | { readonly state: 'missing-source'; readonly references: readonly { readonly kind: VisualizationResolvedReference['kind']; readonly id: string }[]; readonly message: string }
  | { readonly state: 'invalid-analysis' | 'error' | 'unsupported'; readonly message: string }
);

/** Feature-owned; no renderer, persistence, calculation coordinator, or remote retrieval is implied. */
export interface VisualizationSourceProvider {
  readonly kind: VisualizationSourceKind;
  describe(source: VisualizationSource): VisualizationSourceCapabilities;
  supportsChart(source: VisualizationSource, chart: VisualizationChart): VisualizationChartSupport;
  resolve(request: VisualizationSourceRequest, signal: AbortSignal): Promise<VisualizationSourceResolution>;
}

export type VisualizationChartSupport = { readonly chart: VisualizationChart } & (
  | { readonly state: 'supported' }
  | { readonly state: 'unsupported'; readonly reasons: readonly string[] }
);

export interface VisualizationSourceEvidence {
  readonly request: VisualizationSourceRequest;
  readonly capabilities: VisualizationSourceCapabilities;
  /** Exact-chart verdict from the feature adapter; a chart-kind declaration is insufficient. */
  readonly chartSupport: VisualizationChartSupport;
  readonly resolution: VisualizationSourceResolution;
}

export function sameVisualizationScope(left: VisualizationScope, right: VisualizationScope): boolean {
  return left.kind === right.kind && (left.kind !== 'facility' || right.kind === 'facility' && left.facilityGuid === right.facilityGuid);
}

/** Consumers call again against their current identity after await, never just the submitted identity. */
export function isCurrentVisualizationResponse(current: VisualizationRequestIdentity, response: VisualizationSourceResolution,
  signal?: AbortSignal): boolean {
  const actual = response.identity;
  return !signal?.aborted && current.accountGuid === actual.accountGuid && current.workspaceRevision === actual.workspaceRevision
    && current.definitionGuid === actual.definitionGuid && current.definitionRevision === actual.definitionRevision
    && current.requestId === actual.requestId && current.sourceId === actual.sourceId && sameVisualizationScope(current.scope, actual.scope);
}
