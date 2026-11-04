import { Injectable, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { buildEnergyUseInventory } from './inventory/energy-use-inventory.models';

@Injectable()
export class EnergyUsesWorkspaceService {
  private readonly workspace = inject(AccountWorkspaceStore);
  readonly account = this.workspace.account;
  readonly state = this.workspace.status;
  readonly ready = computed(() => this.state() === 'ready');
  readonly loading = computed(() => ['idle', 'loading', 'switching'].includes(this.state()));
  readonly entries = computed(() => {
    const account = this.account();
    return account ? buildEnergyUseInventory(account.guid, this.workspace.facilities(), this.workspace.energyUseEquipment(), this.workspace.energyUseGroups()) : [];
  });
}
