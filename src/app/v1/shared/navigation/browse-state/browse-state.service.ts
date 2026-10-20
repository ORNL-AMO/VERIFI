import { DestroyRef, Injectable, Signal, effect, inject, signal, untracked } from '@angular/core';
import type { InventoryDetailLevel } from '@app/v1/shared/inventory/inventory.models';
import { Observable } from 'rxjs';
import type { PredictorInventoryFilters } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.models';
import type { FacilitySort, FacilityStatusFilter } from '@app/v1/account/data/portfolio/portfolio-facility.view';
import type { PortfolioMeterSort, PortfolioMeterStatusFilter } from '@app/v1/account/data/portfolio/portfolio-meter.view';
import type { PortfolioInventoryView } from '@app/v1/account/data/portfolio/portfolio-inventory.models';

export interface BrowseFilters {
  predictors: PredictorInventoryFilters & { facilityGuid?: string };
  facilityPredictors: PredictorInventoryFilters;
  facilities: { search: string; status: FacilityStatusFilter; sort: FacilitySort };
  meters: { search: string; status: PortfolioMeterStatusFilter; sort: PortfolioMeterSort; facilityGuid?: string };
  facilityMeters: { search: string; status: PortfolioMeterStatusFilter; sort: 'attention' | 'meterName' | 'latestReading' };
}
export type BrowseKind = keyof BrowseFilters;
export interface BrowseKey<K extends BrowseKind = BrowseKind> { readonly kind: K; readonly accountGuid: string; readonly facilityGuid?: string; }
export interface BrowsePosition { readonly scrollTop: number; readonly focusId?: string; }
export interface FacilityPredictorBrowseView { readonly page: number; readonly detail: InventoryDetailLevel; readonly overrides: Readonly<Record<string, InventoryDetailLevel>>; readonly chartGuid?: string; readonly zoom: { start: number; end: number }; }
export type AccountBrowseOrigin = 'facilities' | 'meters' | 'predictors';
export interface FacilityMeterBrowseView { readonly page: number; readonly zoom: { start: number; end: number }; readonly detail?: InventoryDetailLevel; readonly overrides?: Readonly<Record<string, InventoryDetailLevel>>; }

/** UI-only journey state. Nothing is written to storage or domain records. */
@Injectable({ providedIn: 'root' })
export class BrowseStateService {
  private readonly filters = new Map<string, BrowseFilters[BrowseKind]>();
  private readonly positions = new Map<string, BrowsePosition>();
  private readonly facilityViews = new Map<string, FacilityMeterBrowseView>();
  private readonly predictorViews = new Map<string, FacilityPredictorBrowseView>();
  private readonly inventoryViews = new Map<string, PortfolioInventoryView>();
  private readonly origins = signal<ReadonlyMap<string, AccountBrowseOrigin>>(new Map());
  origin(accountGuid: string): AccountBrowseOrigin { return this.origins().get(accountGuid) ?? 'facilities'; }
  setOrigin(accountGuid: string, kind: AccountBrowseOrigin): void { this.origins.update(current => new Map(current).set(accountGuid, kind)); }
  readFilters<K extends BrowseKind>(key: BrowseKey<K>): BrowseFilters[K] | undefined { return this.filters.get(this.id(key)) as BrowseFilters[K] | undefined; }
  saveFilters<K extends BrowseKind>(key: BrowseKey<K>, value: BrowseFilters[K]): void { this.filters.set(this.id(key), { ...value }); }
  readPosition(key: BrowseKey): BrowsePosition | undefined { return this.positions.get(this.id(key)); }
  savePosition(key: BrowseKey, value: BrowsePosition): void { this.positions.set(this.id(key), value); }
  readFacilityView(key: BrowseKey<'facilityMeters'>): FacilityMeterBrowseView | undefined { const view = this.facilityViews.get(this.id(key)); return view ? { ...view, zoom: { ...view.zoom }, overrides: { ...view.overrides } } : undefined; }
  saveFacilityView(key: BrowseKey<'facilityMeters'>, value: FacilityMeterBrowseView): void { this.facilityViews.set(this.id(key), { ...value, zoom: { ...value.zoom }, overrides: { ...value.overrides } }); }
  readPredictorView(key: BrowseKey<'facilityPredictors'>): FacilityPredictorBrowseView | undefined { const view = this.predictorViews.get(this.id(key)); return view ? { ...view, zoom: { ...view.zoom }, overrides: { ...view.overrides } } : undefined; }
  savePredictorView(key: BrowseKey<'facilityPredictors'>, value: FacilityPredictorBrowseView): void { this.predictorViews.set(this.id(key), { ...value, zoom: { ...value.zoom }, overrides: { ...value.overrides } }); }
  readInventoryView(key: BrowseKey<AccountBrowseOrigin>): PortfolioInventoryView | undefined {
    const value = this.inventoryViews.get(this.id(key));
    return value ? { page: value.page, overrides: { ...value.overrides } } : undefined;
  }
  saveInventoryView(key: BrowseKey<AccountBrowseOrigin>, value: PortfolioInventoryView): void {
    this.inventoryViews.set(this.id(key), { page: value.page, overrides: { ...value.overrides } });
  }
  private id(key: BrowseKey): string { return JSON.stringify([key.accountGuid, key.kind, key.facilityGuid ?? '']); }
}

interface BrowseForm<K extends BrowseKind> {
  readonly valueChanges: Observable<unknown>;
  getRawValue(): BrowseFilters[K];
  patchValue(value: BrowseFilters[K], options: { emitEvent: false }): void;
}

/** Hydration does not emit form edits; the returned signal includes both edits and hydration. */
export function rememberBrowseForm<K extends BrowseKind>(key: Signal<BrowseKey<K> | undefined>, form: BrowseForm<K>): Signal<BrowseFilters[K]> {
  const store = inject(BrowseStateService);
  const destroy = inject(DestroyRef);
  const defaults = form.getRawValue();
  const value = signal(defaults);
  let previous: BrowseKey<K> | undefined;
  const subscription = form.valueChanges.subscribe(() => value.set(form.getRawValue()));
  effect(() => {
    const next = key();
    untracked(() => {
      if (JSON.stringify(previous) === JSON.stringify(next)) return;
      if (previous) store.saveFilters(previous, value());
      previous = next;
      const restored = next ? { ...defaults, ...store.readFilters(next) } : defaults;
      form.patchValue(restored, { emitEvent: false });
      value.set(restored);
    });
  });
  destroy.onDestroy(() => { if (previous) store.saveFilters(previous, form.getRawValue()); subscription.unsubscribe(); });
  return value.asReadonly();
}
