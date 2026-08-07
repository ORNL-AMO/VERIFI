import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { EnergyUseCommandHandler } from 'src/app/account-workspace/handlers/energy-use-command-handler.service';
import { Component, inject, Signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbFacilityEnergyUseGroup, IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';

@Component({
  selector: 'app-facility-energy-use-group-management',
  standalone: false,
  templateUrl: './facility-energy-use-group-management.component.html',
  styleUrl: './facility-energy-use-group-management.component.css'
})
export class FacilityEnergyUseGroupManagementComponent {
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly energyUseHandler = inject(EnergyUseCommandHandler);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private router: Router = inject(Router);

  facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  facilityEnergyUseGroups: Signal<Array<IdbFacilityEnergyUseGroup>> = computed(() => [...this.accountWorkspaceStore.facilityEnergyUseGroups()]);

  async addGroup() {
    let facility: IdbFacility = this.facility();
    let newEnergyUseGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(facility.accountId, facility.guid);
    const result = await this.commandBoundary.execute(
      { entityKind: 'energyUseGroup', changeKind: 'add', label: 'Adding energy use group' },
      () => this.energyUseHandler.addGroup(newEnergyUseGroup, this.accountWorkspaceStore.account()?.guid)
    );
    this.selectEditGroup(result.value);
  }

  async selectEditGroup(energyUseGroup: IdbFacilityEnergyUseGroup) {
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let facility: IdbFacility = this.facility();
    energyUseGroup.sidebarOpen = true;
    const activeAccountGuid = account?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'energyUseGroup', changeKind: 'update', entityGuid: energyUseGroup.guid, label: 'Updating energy use group' },
      () => this.energyUseHandler.updateGroup(energyUseGroup, activeAccountGuid)
    );
    this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + facility.guid + '/energy-uses/' + energyUseGroup.guid);
  }

  goToBulkSetup() {
    let facility: IdbFacility = this.facility();
    this.router.navigateByUrl('data-management/' + facility.accountId + '/facilities/' + facility.guid + '/energy-uses/setup-options');
  }
}
