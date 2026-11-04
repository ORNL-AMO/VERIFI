import type { ReportInventoryFilters } from '@app/v1/reports/inventory/report-inventory.models';
import type { EnergyUseInventoryFilters } from '@app/v1/data/energy-uses/inventory/energy-use-inventory.models';
import { DestroyRef, Injectable, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable } from 'rxjs';
import type { PredictorInventoryFilters } from '@app/v1/data/predictors/inventory/predictor-inventory.models';
import type { FacilitySort, FacilityStatusFilter } from '@app/v1/data/facilities/inventory/facility-inventory.view';
import type { MeterInventorySort, MeterInventoryStatusFilter } from '@app/v1/data/meters/inventory/meter-inventory.view';
import { InventoryView } from '@app/v1/shared/inventory/inventory.models';

export interface BrowseFilters {
  'energy-uses': EnergyUseInventoryFilters;
  reports: ReportInventoryFilters;
  analyses: { search: string; scope: 'all' | 'account' | 'facility'; category: 'all' | 'energy' | 'water'; status: 'all' | 'ready' | 'warning' | 'error' | 'active'; sort: 'account-first' | 'attention' | 'modified' | 'name' | 'baseline' };
  predictors: PredictorInventoryFilters;
  facilities: { search: string; status: FacilityStatusFilter; sort: FacilitySort };
  meters: { search: string; status: MeterInventoryStatusFilter; sort: MeterInventorySort };
}
export type BrowseKind = keyof BrowseFilters;
export interface BrowseKey<K extends BrowseKind = BrowseKind> { readonly kind: K; readonly accountGuid: string; readonly facilityGuid?: string; }
export interface BrowsePosition { readonly scrollTop: number; readonly focusId?: string; }
export type InventoryBrowseKind = 'facilities' | 'meters' | 'predictors' | 'energy-uses' | 'analyses' | 'reports';

/** UI-only journey state. Nothing is written to storage or domain records. */
@Injectable({ providedIn: 'root' })
export class BrowseStateService {
  private readonly filters = new Map<string, BrowseFilters[BrowseKind]>();
  private readonly positions = new Map<string, BrowsePosition>();
  private readonly inventoryViews = new Map<string, InventoryView>();
  readFilters<K extends BrowseKind>(key: BrowseKey<K>): BrowseFilters[K] | undefined { return this.filters.get(this.id(key)) as BrowseFilters[K] | undefined; }
  saveFilters<K extends BrowseKind>(key: BrowseKey<K>, value: BrowseFilters[K]): void { this.filters.set(this.id(key), { ...value }); }
  readPosition(key: BrowseKey): BrowsePosition | undefined { return this.positions.get(this.id(key)); }
  savePosition(key: BrowseKey, value: BrowsePosition): void { this.positions.set(this.id(key), value); }
  readInventoryView(key: BrowseKey<InventoryBrowseKind>): InventoryView | undefined {
    const value = this.inventoryViews.get(this.id(key));
    return value ? { ...value, overrides: { ...value.overrides } } : undefined;
  }
  saveInventoryView(key: BrowseKey<InventoryBrowseKind>, value: InventoryView): void {
    this.inventoryViews.set(this.id(key), { ...value, overrides: { ...value.overrides } });
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
  // Project the destination filters synchronously so view hydration never sees
  // the previous scope's criteria and resets a restored page on the next effect.
  return computed(() => {
    const current = value();
    const next = key();
    return JSON.stringify(previous) === JSON.stringify(next) ? current
      : next ? { ...defaults, ...store.readFilters(next) } : defaults;
  });
}
