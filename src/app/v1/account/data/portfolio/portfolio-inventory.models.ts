import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { StatusEvaluationState } from '@app/v1/status/status.models';

export type PortfolioDetailLevel = 'simple' | 'summary' | 'detailed';
export type PortfolioResource = 'facilities' | 'meters' | 'predictors';
export interface PortfolioInventoryView { readonly page: number; readonly overrides: Readonly<Record<string, PortfolioDetailLevel>>; }
export interface PortfolioTileFact { readonly label: string; readonly value: string; }
export interface PortfolioTileLink { readonly label: string; readonly route: readonly string[]; }
export interface PortfolioResourceSummary {
  readonly kind: 'meters' | 'predictors';
  readonly label: string;
  readonly icon: IconName;
  readonly route: readonly string[];
  readonly total: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly validCount: number;
}
export interface PortfolioFindingPreview {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly severity: 'error' | 'warning';
  readonly action?: PortfolioTileLink;
}
export interface PortfolioFacilitySnapshot {
  readonly evaluation: StatusEvaluationState;
  readonly resources: readonly PortfolioResourceSummary[];
  readonly findings: readonly PortfolioFindingPreview[];
  readonly remainingFindings: number;
  readonly address: string;
}
export interface PortfolioTile {
  readonly guid: string;
  readonly name: string;
  readonly icon: IconName;
  readonly route: readonly string[];
  readonly owner?: PortfolioTileLink;
  readonly location?: string;
  readonly chip?: string;
  readonly station?: string;
  readonly status: { readonly tone: 'danger' | 'warning' | 'success' | 'neutral'; readonly icon: IconName; readonly label: string };
  readonly summary: readonly PortfolioTileFact[];
  readonly details: readonly PortfolioTileFact[];
  readonly findings: readonly string[];
  readonly detailLink?: PortfolioTileLink;
  readonly facilitySnapshot?: PortfolioFacilitySnapshot;
}
export interface PortfolioTileDetailChange { readonly guid: string; readonly level: PortfolioDetailLevel | null; }
export const PORTFOLIO_DETAIL_LEVELS: readonly PortfolioDetailLevel[] = ['simple', 'summary', 'detailed'];
export const PORTFOLIO_PAGE_SIZE = 24;
export function isPortfolioDetailLevel(value: unknown): value is PortfolioDetailLevel {
  return value === 'simple' || value === 'summary' || value === 'detailed';
}
