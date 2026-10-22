import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { StatusEvaluationState } from '@app/v1/status/status.models';

export type InventoryDetailLevel = 'simple' | 'summary' | 'detailed';
export interface InventoryTileFact { readonly label: string; readonly value: string; }
export interface InventoryTileLink { readonly label: string; readonly route: readonly string[]; }
export interface InventoryResourceSummary {
  readonly kind: 'meters' | 'predictors';
  readonly label: string;
  readonly icon: IconName;
  readonly route: readonly string[];
  readonly total: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly validCount: number;
}
export interface InventoryFindingPreview {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly severity: 'error' | 'warning';
  readonly action?: InventoryTileLink;
}
export interface InventoryFacilitySnapshot {
  readonly evaluation: StatusEvaluationState;
  readonly resources: readonly InventoryResourceSummary[];
  readonly findings: readonly InventoryFindingPreview[];
  readonly remainingFindings: number;
  readonly address: string;
}
export interface InventoryRecentReading {
  readonly guid: string;
  readonly dateLabel: string;
  readonly dateKey: string;
  readonly tone: 'neutral' | 'danger' | 'warning';
  readonly valueLabel: string;
  readonly quantityLabel: 'Energy use' | 'Consumption' | 'RECs' | 'Value';
  readonly statusLabel?: string;
  readonly icon?: IconName;
  readonly description: string;
}
export interface InventoryMeterSnapshotFact extends InventoryTileFact {
  readonly route?: readonly string[];
}
export interface InventoryReadingSnapshot {
  readonly readingCount: number;
  readonly rangeLabel: string;
  readonly invalidDateCount: number;
  readonly readingsLink: InventoryTileLink;
  readonly recentReadings: readonly InventoryRecentReading[];
  readonly facts: readonly InventoryTileFact[];
  readonly findings: readonly InventoryFindingPreview[];
  readonly remainingFindings: number;
}
export interface InventoryMeterSnapshot extends InventoryReadingSnapshot {
  readonly group: InventoryMeterSnapshotFact;
}
export interface InventoryTile {
  readonly guid: string;
  readonly name: string;
  readonly icon: IconName;
  readonly route: readonly string[];
  readonly owner?: InventoryTileLink;
  readonly analysisSnapshot?: InventoryAnalysisSnapshot;
  readonly reportSnapshot?: InventoryReportSnapshot;
  readonly location?: string;
  readonly chip?: string;
  readonly chipIcon?: IconName;
  readonly simpleChip?: string;
  readonly station?: string;
  readonly stationLink?: InventoryTileLink;
  readonly stationIssue?: string;
  readonly status: { readonly tone: 'danger' | 'warning' | 'success' | 'neutral'; readonly icon: IconName; readonly label: string };
  readonly facilitySnapshot?: InventoryFacilitySnapshot;
  readonly meterSnapshot?: InventoryMeterSnapshot;
  readonly predictorSnapshot?: InventoryReadingSnapshot;
}
export interface InventoryTileDetailChange { readonly guid: string; readonly level: InventoryDetailLevel; }
export interface InventoryAnalysisSnapshot {
  readonly scope: 'account' | 'facility';
  readonly active: boolean;
  readonly outcomes: readonly { readonly label: string; readonly value: string; readonly description: string; readonly unavailable: boolean }[];
  readonly facts: readonly InventoryTileFact[];
  readonly rosterTitle: string;
  readonly selectionProgress?: { readonly valid: number; readonly total: number; readonly evaluation: StatusEvaluationState };
  readonly roster: readonly { readonly id: string; readonly name: string; readonly detail: string; readonly state: string }[];
  readonly usage?: string;
  readonly findings: readonly Pick<InventoryFindingPreview, 'id' | 'title' | 'description' | 'severity'>[];
  readonly modified: string;
}
export interface InventoryTileMenuAction { readonly id: 'readings' | 'quality' | 'copy' | 'delete' | 'details' | 'active' | 'compare' | 'rename'; readonly label: string; readonly icon: IconName; readonly disabled?: boolean; readonly disabledReason?: string; }
export interface InventoryTileActionRequest { readonly guid: string; readonly action: InventoryTileMenuAction['id']; }
export const INVENTORY_DETAIL_LEVELS: readonly InventoryDetailLevel[] = ['simple', 'summary', 'detailed'];
export const INVENTORY_PAGE_SIZE = 24;
export function isInventoryDetailLevel(value: unknown): value is InventoryDetailLevel {
  return value === 'simple' || value === 'summary' || value === 'detailed';
}

export interface InventoryReportSnapshot {
  readonly scope: 'account' | 'facility';
  readonly typeLabel: string;
  readonly facts: readonly InventoryTileFact[];
  readonly modified: string;
  readonly scopeLabel: string;
  readonly findings: readonly Pick<InventoryFindingPreview, 'id' | 'title' | 'description' | 'severity'>[];
}
