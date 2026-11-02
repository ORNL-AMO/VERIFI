import { Injectable, Injector, inject } from '@angular/core';
import type { InventoryBrowseKind } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { LocalStorageService } from 'ngx-webstorage';
import { InventoryDetailLevel, isInventoryDetailLevel } from './inventory.models';

export const PORTFOLIO_DETAIL_STORAGE_KEY = 'v1PortfolioDetailLevels';

/** Device-only display preference. Never stores inventory records or individual overrides. */
@Injectable({ providedIn: 'root' })
export class InventoryDetailPreferencesService {
  private readonly injector = inject(Injector);
  private readonly levels = new Map<string, InventoryDetailLevel>();
  read(accountGuid: string, resource: InventoryBrowseKind): InventoryDetailLevel {
    const key = JSON.stringify([accountGuid, resource]);
    if (this.levels.has(key)) return this.levels.get(key)!;
    let level: InventoryDetailLevel = 'simple';
    try {
      const stored: unknown = this.injector.get(LocalStorageService).retrieve(PORTFOLIO_DETAIL_STORAGE_KEY);
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        const candidate: unknown = (stored as Record<string, unknown>)[key];
        if (isInventoryDetailLevel(candidate)) level = candidate;
      }
    } catch { /* Unavailable browser storage must not block browsing. */ }
    this.levels.set(key, level);
    return level;
  }
  save(accountGuid: string, resource: InventoryBrowseKind, level: InventoryDetailLevel): void {
    this.levels.set(JSON.stringify([accountGuid, resource]), level);
    try {
      const storage = this.injector.get(LocalStorageService);
      const stored: unknown = storage.retrieve(PORTFOLIO_DETAIL_STORAGE_KEY);
      const valid: Record<string, InventoryDetailLevel> = {};
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        for (const [key, value] of Object.entries(stored)) if (isInventoryDetailLevel(value)) valid[key] = value;
      }
      valid[JSON.stringify([accountGuid, resource])] = level;
      storage.store(PORTFOLIO_DETAIL_STORAGE_KEY, valid);
    } catch { /* Keep the working in-memory preference even when persistence fails. */ }
  }
}
