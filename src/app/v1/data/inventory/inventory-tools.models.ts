import { Signal } from '@angular/core';

export type InventoryResource = 'meters' | 'predictors';

export interface InventoryToolsContext<R extends string = InventoryResource> {
  readonly accountGuid: string | undefined;
  readonly facilityGuid: string | undefined;
  readonly resource: R;
  readonly energyUseGroupGuid?: string;
}

/** The routed inventory supplies filtering and committed browsing context. */
export interface InventoryToolsSource<R extends string = InventoryResource> {
  readonly context: Signal<InventoryToolsContext<R>>;
  readonly matchingGuids: Signal<readonly string[]>;
  readonly scopeGuids: Signal<readonly string[]>;
  readonly filtersKey: Signal<string>;
}

export function inventoryToolsContextKey(context: InventoryToolsContext<string>): string {
  return JSON.stringify(context.energyUseGroupGuid ? [context.accountGuid, context.resource, context.facilityGuid, context.energyUseGroupGuid] : [context.accountGuid, context.resource, context.facilityGuid]);
}
