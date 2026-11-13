import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { StatusEvaluationState } from '@app/v1/status/status.models';
import type { Params } from '@angular/router';

export type InventoryDetailLevel = 'simple' | 'summary' | 'detailed';
export interface InventoryTileFact { readonly label: string; readonly value: string; }
export interface InventoryTileLink { readonly label: string; readonly route: readonly string[]; readonly queryParams?: Params; readonly facilityInventory?: FacilityInventoryDestination; }
export interface InventoryFacilityLink extends InventoryTileLink {
  readonly facilityGuid: string;
  readonly queryParams?: Params;
}
export interface FacilityInventoryDestination {
  readonly facilityGuid: string;
  readonly resource: 'meters' | 'predictors' | 'energy-uses';
}
export interface InventoryResourceSummary {
  readonly facilityGuid: string;
  readonly queryParams?: Params;
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
  readonly queryParams?: Params;
  readonly facilityInventory?: FacilityInventoryDestination;
  readonly owner?: InventoryFacilityLink;
  readonly analysisSnapshot?: InventoryAnalysisSnapshot;
  readonly reportSnapshot?: InventoryReportSnapshot;
  readonly visualizationSnapshot?: InventoryVisualizationSnapshot;
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
  readonly energyUseSnapshot?: InventoryEnergyUseSnapshot;
  readonly energyUseGroupSnapshot?: InventoryEnergyUseGroupSnapshot;
}
export interface InventoryMeterGroupLink {
  readonly guid: string;
  readonly label: string;
  /** Unavailable/foreign links retain their identity without offering a destination. */
  readonly route?: readonly string[];
}
export interface InventoryEnergyUseGroupSnapshot {
  readonly meterGroups?: readonly InventoryMeterGroupLink[];
  readonly equipmentTypes: readonly { readonly label: string; readonly icon: IconName }[];
  readonly items: readonly { readonly guid: string; readonly name: string; readonly icon: IconName; readonly route: readonly string[] }[];
  readonly categories: readonly string[];
  readonly sources: readonly string[];
  readonly years: readonly number[];
}
export interface InventoryEnergyUseSnapshot {
  readonly meterGroups?: readonly InventoryMeterGroupLink[];
  readonly sources: readonly string[];
  readonly group: string;
  readonly years: readonly number[];
  readonly notes: string;
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
export interface InventoryTileMenuAction { readonly id: 'readings' | 'quality' | 'copy' | 'copy-scope' | 'delete' | 'details' | 'active' | 'compare' | 'rename'; readonly label: string; readonly icon: IconName; readonly disabled?: boolean; readonly disabledReason?: string; }
export interface InventoryTileActionRequest { readonly guid: string; readonly action: InventoryTileMenuAction['id']; }
export const INVENTORY_DETAIL_LEVELS: readonly InventoryDetailLevel[] = ['simple', 'summary', 'detailed'];
export const INVENTORY_PAGE_SIZE = 24;
export function isInventoryDetailLevel(value: unknown): value is InventoryDetailLevel {
  return value === 'simple' || value === 'summary' || value === 'detailed';
}

export interface InventoryReportSnapshot {
  readonly formatLabel?: string;
  readonly scope: 'account' | 'facility';
  readonly typeLabel: string;
  /** Defaults to pending when unspecified. */
  readonly contentPending?: boolean;
  readonly facts: readonly InventoryTileFact[];
  readonly modified: string;
  readonly scopeLabel: string;
  readonly findings: readonly (Pick<InventoryFindingPreview, 'id' | 'title' | 'description' | 'severity' | 'action'> & { readonly unavailableReason?: string })[];
}

export interface InventoryView { readonly page: number; readonly detail?: InventoryDetailLevel; readonly overrides: Readonly<Record<string, InventoryDetailLevel>>; }

export interface InventoryVisualizationSnapshot {
  readonly typeLabel: string;
  readonly scopeLabel: string;
  readonly periodLabel: string;
  readonly chartLabel: string;
  readonly modified: string;
  readonly issues: readonly string[];
}
