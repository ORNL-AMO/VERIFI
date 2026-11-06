import { Injectable, Signal, signal } from '@angular/core';
import { InventoryResource } from './inventory-tools.models';
import { AccountPortfolioTab } from '@app/v1/routing/workspace-route';

export interface InventoryCreationAction {
  readonly resource: AccountPortfolioTab;
  readonly label: string;
  readonly canCreate: Signal<boolean>;
  create(): void;
}

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
  private readonly creationValue = signal<InventoryCreationAction | undefined>(undefined);
  readonly creation = this.creationValue.asReadonly();

  registerCreation(action: InventoryCreationAction): () => void {
    this.creationValue.set(action);
    return () => { if (this.creationValue() === action) this.creationValue.set(undefined); };
  }

  register(actions: InventoryHeaderActions): () => void {
    this.currentValue.set(actions);
    return () => {
      if (this.currentValue() === actions) {
        this.currentValue.set(undefined);
      }
    };
  }
}
