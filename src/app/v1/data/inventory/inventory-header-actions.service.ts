import { Injectable, Signal, signal } from '@angular/core';
import { InventoryResource } from './inventory-tools.models';

export interface InventoryHeaderActions {
  readonly resource: InventoryResource;
  readonly selecting: Signal<boolean>;
  readonly canToggle: Signal<boolean>;
  toggleSelection(): void;
}

/** One Data header lifetime; routed owners register without exposing their view children. */
@Injectable()
export class InventoryHeaderActionsRegistry {
  private readonly currentValue = signal<InventoryHeaderActions | undefined>(undefined);
  readonly current = this.currentValue.asReadonly();

  register(actions: InventoryHeaderActions): () => void {
    this.currentValue.set(actions);
    return () => {
      if (this.currentValue() === actions) {
        this.currentValue.set(undefined);
      }
    };
  }
}
