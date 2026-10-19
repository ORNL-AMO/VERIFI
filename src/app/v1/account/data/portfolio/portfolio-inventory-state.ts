import { DestroyRef, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AccountBrowseOrigin, BrowseKey, BrowseStateService } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { PortfolioDetailPreferencesService } from './portfolio-detail-preferences.service';
import { PORTFOLIO_PAGE_SIZE, PortfolioDetailLevel, PortfolioTile, PortfolioTileDetailChange } from './portfolio-inventory.models';

/** Account inventory display state; feature controllers retain filtering and navigation. */
export class PortfolioInventoryState {
  private readonly browse = inject(BrowseStateService);
  private readonly preferences = inject(PortfolioDetailPreferencesService);
  readonly detailControl = new FormControl<PortfolioDetailLevel>('simple', { nonNullable: true });
  readonly detail = signal<PortfolioDetailLevel>('simple');
  readonly page = signal(0);
  readonly overrides = signal<Readonly<Record<string, PortfolioDetailLevel>>>({});
  private readonly hydratedKey = signal('');
  readonly ready = computed(() => this.hydratedKey() === JSON.stringify(this.key()));
  readonly pages = computed(() => Math.max(1, Math.ceil(this.tiles().length / PORTFOLIO_PAGE_SIZE)));
  readonly visibleTiles = computed(() => this.tiles().slice(this.page() * PORTFOLIO_PAGE_SIZE, (this.page() + 1) * PORTFOLIO_PAGE_SIZE));
  readonly visibleIds = computed(() => this.visibleTiles().map(tile => tile.guid));
  readonly start = computed(() => this.tiles().length ? this.page() * PORTFOLIO_PAGE_SIZE + 1 : 0);
  readonly end = computed(() => Math.min((this.page() + 1) * PORTFOLIO_PAGE_SIZE, this.tiles().length));
  private activeKey?: BrowseKey<AccountBrowseOrigin>;

  constructor(private readonly key: Signal<BrowseKey<AccountBrowseOrigin> | undefined>,
    readonly tiles: Signal<readonly PortfolioTile[]>, allIds: Signal<readonly string[]>, filters: Signal<unknown>, inventoryReady: Signal<boolean>) {
    let previousFilters = '';
    effect(() => {
      const next = key(); const criteria = JSON.stringify(filters());
      untracked(() => {
        if (JSON.stringify(next) !== JSON.stringify(this.activeKey)) {
          this.save(); this.activeKey = next;
          const saved = next ? this.browse.readInventoryView(next) : undefined;
          this.page.set(saved?.page ?? 0); this.overrides.set(saved?.overrides ?? {});
          const level = next ? this.preferences.read(next.accountGuid, next.kind) : 'simple';
          this.detail.set(level); this.detailControl.setValue(level, { emitEvent: false });
          previousFilters = criteria; this.hydratedKey.set(JSON.stringify(next));
        } else if (criteria !== previousFilters) { previousFilters = criteria; this.page.set(0); this.save(); }
      });
    });
    effect(() => {
      const ids = allIds(); const count = tiles().length; const loaded = inventoryReady(); const ready = this.ready();
      untracked(() => {
        if (!loaded || !ready) return;
        const valid = new Set(ids);
        const overrides = Object.fromEntries(Object.entries(this.overrides()).filter(([guid]) => valid.has(guid)));
        if (Object.keys(overrides).length !== Object.keys(this.overrides()).length) this.overrides.set(overrides);
        this.page.set(Math.min(this.page(), Math.max(0, Math.ceil(count / PORTFOLIO_PAGE_SIZE) - 1)));
        this.save();
      });
    });
    const subscription = this.detailControl.valueChanges.subscribe(level => {
      if (level === this.detail()) return;
      this.detail.set(level); this.overrides.set({});
      if (this.activeKey) this.preferences.save(this.activeKey.accountGuid, this.activeKey.kind, level);
      this.save();
    });
    inject(DestroyRef).onDestroy(() => { this.save(); subscription.unsubscribe(); });
  }
  selectPage(page: number): void { this.page.set(Math.max(0, Math.min(page, this.pages() - 1))); this.save(); }
  setTileDetail(change: PortfolioTileDetailChange): void {
    const next = { ...this.overrides() };
    if (change.level === null) delete next[change.guid]; else next[change.guid] = change.level;
    this.overrides.set(next); this.save();
  }
  private save(): void { if (this.activeKey) this.browse.saveInventoryView(this.activeKey, { page: this.page(), overrides: this.overrides() }); }
}
