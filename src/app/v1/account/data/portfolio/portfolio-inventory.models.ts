import type { IconName } from '@app/v1/shared/icons/icon-registry';

export type PortfolioDetailLevel = 'simple' | 'summary' | 'detailed';
export type PortfolioResource = 'facilities' | 'meters' | 'predictors';
export interface PortfolioInventoryView { readonly page: number; readonly overrides: Readonly<Record<string, PortfolioDetailLevel>>; }
export interface PortfolioTileFact { readonly label: string; readonly value: string; }
export interface PortfolioTileLink { readonly label: string; readonly route: readonly string[]; }
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
}
export interface PortfolioTileDetailChange { readonly guid: string; readonly level: PortfolioDetailLevel | null; }
export const PORTFOLIO_DETAIL_LEVELS: readonly PortfolioDetailLevel[] = ['simple', 'summary', 'detailed'];
export const PORTFOLIO_PAGE_SIZE = 24;
export function isPortfolioDetailLevel(value: unknown): value is PortfolioDetailLevel {
  return value === 'simple' || value === 'summary' || value === 'detailed';
}
