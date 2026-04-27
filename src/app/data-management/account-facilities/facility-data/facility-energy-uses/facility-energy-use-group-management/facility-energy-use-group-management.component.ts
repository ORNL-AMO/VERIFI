import { Component, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
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
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService = inject(FacilityEnergyUseGroupsDbService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private router: Router = inject(Router);

  facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: null });
  facilityEnergyUseGroups: Signal<Array<IdbFacilityEnergyUseGroup>> = toSignal(this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups, { initialValue: [] });

  async addGroup() {
    let facility: IdbFacility = this.facility();
    let newEnergyUseGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(facility.accountId, facility.guid);
    newEnergyUseGroup = await firstValueFrom(this.facilityEnergyUseGroupsDbService.addWithObservable(newEnergyUseGroup));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseGroups(account, facility);
    this.selectEditGroup(newEnergyUseGroup);
  }

  async selectEditGroup(energyUseGroup: IdbFacilityEnergyUseGroup) {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facility: IdbFacility = this.facility();
    energyUseGroup.sidebarOpen = true;
    await firstValueFrom(this.facilityEnergyUseGroupsDbService.updateWithObservable(energyUseGroup));
    await this.dbChangesService.setAccountFacilityEnergyUseGroups(account, facility);
    this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + facility.guid + '/energy-uses/' + energyUseGroup.guid);
  }

  goToBulkSetup() {
    let facility: IdbFacility = this.facility();
    this.router.navigateByUrl('data-management/' + facility.accountId + '/facilities/' + facility.guid + '/energy-uses/setup-options');
  }
}
