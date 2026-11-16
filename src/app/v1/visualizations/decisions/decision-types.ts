import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { UtilitySelectionMode, UtilityVisualizationSource, VisualizationChart, VisualizationDefinition,
  VisualizationFacilitySelection, VisualizationSourceKind, VisualizationTraceType } from '@domain/visualizations/visualization-definition';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { VisualizationReferenceIssue } from '@domain/visualizations/visualization-references';

export type DecisionKind = 'facilities' | 'chart' | 'sources' | 'source' | 'measure' | 'selection-mode' | 'resources'
  | 'data-settings' | 'item' | 'period' | 'appearance';
export interface DecisionRef { readonly kind: DecisionKind; readonly sourceId?: string; readonly itemKey?: string; }
export type DecisionItemIdentity = { readonly resourceGuid: string; readonly seriesId?: never }
  | { readonly seriesId: string; readonly resourceGuid?: never };
export interface DecisionItemAppearance {
  readonly traceType?: VisualizationTraceType;
  readonly label?: string;
  readonly color?: string;
  readonly axis?: 'left' | 'right';
  readonly lineStyle?: 'solid' | 'dashed' | 'dotted';
  readonly visible?: boolean;
  readonly order?: number;
}
export type DecisionItemPatch = { readonly [K in keyof DecisionItemAppearance]?: DecisionItemAppearance[K] | null };
export interface VisualizationDecisionItem {
  readonly key: string;
  readonly sourceId: string;
  readonly selectedId: string;
  readonly identity: DecisionItemIdentity;
  readonly label: string;
  readonly detail: string;
  readonly unit: string;
  readonly available: boolean;
  readonly missing: boolean;
  readonly customized: boolean;
  readonly customColor: boolean;
  readonly appearance: DecisionItemAppearance & { readonly traceType: VisualizationTraceType; readonly axis: 'left' | 'right'; readonly visible: boolean };
}
export interface DecisionResourceChoice {
  readonly value: string;
  readonly label: string;
  readonly detail: string;
  readonly icon: IconName;
  readonly available: boolean;
}
export type VisualizationDecisionAction =
  | { readonly kind: 'facilities'; readonly selection: VisualizationFacilitySelection }
  | { readonly kind: 'chart'; readonly chart: VisualizationChart }
  | { readonly kind: 'chart-type'; readonly traceType: 'line' | 'bar' }
  | { readonly kind: 'add-source'; readonly sourceKind: VisualizationSourceKind }
  | { readonly kind: 'remove-source-kind'; readonly sourceKind: VisualizationSourceKind }
  | { readonly kind: 'measure'; readonly sourceId: string; readonly measure: UtilityVisualizationSource['measure'] }
  | { readonly kind: 'selection-mode'; readonly sourceId: string; readonly mode: UtilitySelectionMode }
  | { readonly kind: 'toggle-resource'; readonly sourceId: string; readonly resourceId: string; readonly selected: boolean }
  | { readonly kind: 'set-resources'; readonly sourceId: string; readonly resourceIds: readonly string[] }
  | { readonly kind: 'source-settings'; readonly sourceId: string;
      readonly settings: Partial<Pick<UtilityVisualizationSource, 'dataMode' | 'aggregation' | 'groupBy' | 'settings' | 'charge'>> }
  | { readonly kind: 'item-style'; readonly sourceId: string; readonly item: DecisionItemIdentity; readonly changes: DecisionItemPatch };

export interface DecisionChangeContext {
  readonly snapshot: AccountWorkspaceSnapshot;
  readonly invalidNodeIds?: readonly string[];
  readonly preservedReferences?: readonly VisualizationReferenceIssue[];
}
export type DecisionChangeResult = { readonly state: 'unchanged' }
  | { readonly state: 'apply' | 'confirm'; readonly definition: VisualizationDefinition;
      readonly cleared: readonly string[]; readonly affectedNodeIds: readonly string[]; readonly next?: DecisionRef };
