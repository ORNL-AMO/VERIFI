import { Injectable, Injector, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { PortfolioDetailLevel, PortfolioResource, isPortfolioDetailLevel } from './portfolio-inventory.models';

export const PORTFOLIO_DETAIL_STORAGE_KEY = 'v1PortfolioDetailLevels';

/** Device-only display preference. Never stores inventory records or individual overrides. */
@Injectable({ providedIn: 'root' })
export class PortfolioDetailPreferencesService {
  private readonly injector = inject(Injector);
  private readonly levels = new Map<string, PortfolioDetailLevel>();
  read(accountGuid: string, resource: PortfolioResource): PortfolioDetailLevel {
    const key = JSON.stringify([accountGuid, resource]);
    if (this.levels.has(key)) return this.levels.get(key)!;
    let level: PortfolioDetailLevel = 'simple';
    try {
      const stored: unknown = this.injector.get(LocalStorageService).retrieve(PORTFOLIO_DETAIL_STORAGE_KEY);
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        const candidate: unknown = (stored as Record<string, unknown>)[key];
        if (isPortfolioDetailLevel(candidate)) level = candidate;
      }
    } catch { /* Unavailable browser storage must not block browsing. */ }
    this.levels.set(key, level);
    return level;
  }
  save(accountGuid: string, resource: PortfolioResource, level: PortfolioDetailLevel): void {
    this.levels.set(JSON.stringify([accountGuid, resource]), level);
    try {
      const storage = this.injector.get(LocalStorageService);
      const stored: unknown = storage.retrieve(PORTFOLIO_DETAIL_STORAGE_KEY);
      const valid: Record<string, PortfolioDetailLevel> = {};
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        for (const [key, value] of Object.entries(stored)) if (isPortfolioDetailLevel(value)) valid[key] = value;
      }
      valid[JSON.stringify([accountGuid, resource])] = level;
      storage.store(PORTFOLIO_DETAIL_STORAGE_KEY, valid);
    } catch { /* Keep the working in-memory preference even when persistence fails. */ }
  }
}
