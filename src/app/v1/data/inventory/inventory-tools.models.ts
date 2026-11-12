import { Signal } from '@angular/core';
import type { ResourceSelection } from '@domain/visualizations/visualization-definition';

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
  /** Capture intent supplied by the source feature, independent of paging and opaque browse keys. */
  readonly captureSelection?: Signal<InventoryUtilityCaptureSelection>;
}

export type InventoryUtilityCaptureSelection =
  | { readonly state: 'supported'; readonly selection: Extract<ResourceSelection, { kind: 'rule' }> }
  | { readonly state: 'unsupported'; readonly reason: string };

export function inventoryToolsContextKey(context: InventoryToolsContext): string {
  return JSON.stringify([context.accountGuid, context.resource, context.facilityGuid]);
}
