import { Injectable, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { buildEnergyUseGroups } from './inventory/energy-use-group.models';
import { buildEnergyUseInventory } from './inventory/energy-use-inventory.models';

@Injectable()
export class EnergyUsesWorkspaceService {
  private readonly workspace = inject(AccountWorkspaceStore);
  readonly account = this.workspace.account;
  readonly state = this.workspace.status;
  readonly ready = computed(() => this.state() === 'ready');
  readonly loading = computed(() => ['idle', 'loading', 'switching'].includes(this.state()));
  readonly groups = computed(() => {
    const account = this.account();
    return account ? buildEnergyUseGroups(account.guid, this.workspace.facilities(), this.workspace.energyUseGroups(), this.entries()) : [];
  });
  readonly entries = computed(() => {
    const account = this.account();
    return account ? buildEnergyUseInventory(account.guid, this.workspace.facilities(), this.workspace.energyUseEquipment(), this.workspace.energyUseGroups(), this.workspace.meterGroups()) : [];
  });
}
