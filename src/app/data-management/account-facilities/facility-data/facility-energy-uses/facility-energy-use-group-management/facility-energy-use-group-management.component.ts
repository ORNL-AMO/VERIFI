import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
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
 facility: IdbFacility;
  facilitySub: Subscription;

  facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup>;
  facilityEnergyUseGroupsSub: Subscription;
  constructor(private facilityDbService: FacilitydbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
    this.facilityEnergyUseGroupsSub = this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups.subscribe(groups => {
      this.facilityEnergyUseGroups = groups;
    });
  }

  ngOnDestroy(): void {
    this.facilitySub.unsubscribe();
    this.facilityEnergyUseGroupsSub.unsubscribe();
  }

  async addGroup() {
    let newEnergyUseGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(this.facility.accountId, this.facility.guid);
    newEnergyUseGroup = await firstValueFrom(this.facilityEnergyUseGroupsDbService.addWithObservable(newEnergyUseGroup));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeters(account, this.facility);
    this.selectEditGroup(newEnergyUseGroup);
  }

  async selectEditGroup(energyUseGroup: IdbFacilityEnergyUseGroup) {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    energyUseGroup.sidebarOpen = true;
    await firstValueFrom(this.facilityEnergyUseGroupsDbService.updateWithObservable(energyUseGroup));
    await this.dbChangesService.setMeters(account, facility);
    this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + facility.guid + '/energy-uses/' + energyUseGroup.guid);
  }

  async createCopy(energyUseGroup: IdbFacilityEnergyUseGroup) {
    let copyGroup: IdbFacilityEnergyUseGroup = JSON.parse(JSON.stringify(energyUseGroup));
    delete copyGroup.id;
    copyGroup.guid = Math.random().toString(36).substr(2, 9);
    copyGroup.name = copyGroup.name + ' (copy)';
    copyGroup = await firstValueFrom(this.facilityEnergyUseGroupsDbService.addWithObservable(copyGroup));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(account, facility);
    this.selectEditGroup(copyGroup);
  }
}
