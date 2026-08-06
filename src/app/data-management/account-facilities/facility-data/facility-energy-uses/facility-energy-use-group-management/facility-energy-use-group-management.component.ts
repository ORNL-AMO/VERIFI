import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
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
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService = inject(FacilityEnergyUseGroupsDbService);
  private router: Router = inject(Router);

  facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  facilityEnergyUseGroups: Signal<Array<IdbFacilityEnergyUseGroup>> = computed(() => [...this.accountWorkspaceStore.facilityEnergyUseGroups()]);

  async addGroup() {
    let facility: IdbFacility = this.facility();
    let newEnergyUseGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(facility.accountId, facility.guid);
    newEnergyUseGroup = await firstValueFrom(this.facilityEnergyUseGroupsDbService.addWithObservable(newEnergyUseGroup));
    let account: IdbAccount = this.accountWorkspaceStore.account();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.selectEditGroup(newEnergyUseGroup);
  }

  async selectEditGroup(energyUseGroup: IdbFacilityEnergyUseGroup) {
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let facility: IdbFacility = this.facility();
    energyUseGroup.sidebarOpen = true;
    await firstValueFrom(this.facilityEnergyUseGroupsDbService.updateWithObservable(energyUseGroup));
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + facility.guid + '/energy-uses/' + energyUseGroup.guid);
  }

  goToBulkSetup() {
    let facility: IdbFacility = this.facility();
    this.router.navigateByUrl('data-management/' + facility.accountId + '/facilities/' + facility.guid + '/energy-uses/setup-options');
  }
}
