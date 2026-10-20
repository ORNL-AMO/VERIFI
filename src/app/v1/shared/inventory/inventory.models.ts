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
  readonly location?: string;
  readonly chip?: string;
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
export interface InventoryTileMenuAction { readonly id: 'readings' | 'copy' | 'delete'; readonly label: string; readonly icon: IconName; readonly disabled?: boolean; }
export interface InventoryTileActionRequest { readonly guid: string; readonly action: InventoryTileMenuAction['id']; }
export const INVENTORY_DETAIL_LEVELS: readonly InventoryDetailLevel[] = ['simple', 'summary', 'detailed'];
export const INVENTORY_PAGE_SIZE = 24;
export function isInventoryDetailLevel(value: unknown): value is InventoryDetailLevel {
  return value === 'simple' || value === 'summary' || value === 'detailed';
}
