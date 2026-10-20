import type { InventoryDetailLevel } from '@app/v1/shared/inventory/inventory.models';
export type PortfolioResource = 'facilities' | 'meters' | 'predictors';
export interface PortfolioInventoryView { readonly page: number; readonly overrides: Readonly<Record<string, InventoryDetailLevel>>; }
export type {
  InventoryDetailLevel as PortfolioDetailLevel,
  InventoryTileLink as PortfolioTileLink,
  InventoryResourceSummary as PortfolioResourceSummary,
  InventoryFindingPreview as PortfolioFindingPreview,
  InventoryFacilitySnapshot as PortfolioFacilitySnapshot,
  InventoryTile as PortfolioTile,
  InventoryTileDetailChange as PortfolioTileDetailChange
} from '@app/v1/shared/inventory/inventory.models';
export { INVENTORY_PAGE_SIZE as PORTFOLIO_PAGE_SIZE, isInventoryDetailLevel as isPortfolioDetailLevel } from '@app/v1/shared/inventory/inventory.models';
