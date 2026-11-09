import { Signal } from '@angular/core';

export type InventoryResource = 'meters' | 'predictors';

export interface InventoryToolsContext {
  readonly accountGuid: string | undefined;
  readonly facilityGuid: string | undefined;
  readonly resource: InventoryResource;
}

/** The routed inventory supplies filtering and committed browsing context. */
export interface InventoryToolsSource {
  readonly context: Signal<InventoryToolsContext>;
  readonly matchingGuids: Signal<readonly string[]>;
  readonly scopeGuids: Signal<readonly string[]>;
  readonly filtersKey: Signal<string>;
}

export function inventoryToolsContextKey(context: InventoryToolsContext): string {
  return JSON.stringify([context.accountGuid, context.resource, context.facilityGuid]);
}
