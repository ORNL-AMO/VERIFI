import { InventoryResource } from './inventory-tools.models';
import { Injectable, Signal, signal } from '@angular/core';
import { AccountPortfolioTab } from '@app/v1/routing/workspace-route';

export interface InventoryCreationAction {
  readonly resource: AccountPortfolioTab;
  readonly label: string;
  readonly canCreate: Signal<boolean>;
  create(): void;
}

export interface InventoryExportAction {
  readonly resource: AccountPortfolioTab;
  readonly available: Signal<boolean>;
  open(): void;
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

  private readonly exportValue = signal<InventoryExportAction | undefined>(undefined);
  readonly exportAction = this.exportValue.asReadonly();

  registerExport(action: InventoryExportAction): () => void {
    this.exportValue.set(action);
    return () => { if (this.exportValue() === action) this.exportValue.set(undefined); };
  }

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
