import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbFacilityEnergyUseGroup, IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

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

  facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment>;
  facilityEnergyUseEquipmentSub: Subscription;

  groupToDelete: IdbFacilityEnergyUseGroup;
  orderDataField: string = 'name';
  orderByDirection: string = 'desc';

  currentPageNumber: number = 1;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;

  constructor(private facilityDbService: FacilitydbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private router: Router,
    private sharedDataService: SharedDataService,
    private loadingService: LoadingService,
    private toastNotificationsService: ToastNotificationsService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService
  ) { }

  ngOnInit(): void {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
    this.facilityEnergyUseGroupsSub = this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups.subscribe(groups => {
      this.facilityEnergyUseGroups = groups;
    });
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
    this.facilityEnergyUseEquipmentSub = this.facilityEnergyUseEquipmentDbService.facilityEnergyUseEquipment.subscribe(equipment => {
      this.facilityEnergyUseEquipment = equipment;
    });
  }

  ngOnDestroy(): void {
    this.facilitySub.unsubscribe();
    this.facilityEnergyUseGroupsSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
    this.facilityEnergyUseEquipmentSub.unsubscribe();
  }

  async addGroup() {
    let newEnergyUseGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(this.facility.accountId, this.facility.guid);
    newEnergyUseGroup = await firstValueFrom(this.facilityEnergyUseGroupsDbService.addWithObservable(newEnergyUseGroup));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseGroups(account, this.facility);
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
    await this.dbChangesService.setAccountFacilityEnergyUseGroups(account, facility);
    this.selectEditGroup(copyGroup);
  }

  selectDeleteGroup(group: IdbFacilityEnergyUseGroup) {
    this.sharedDataService.modalOpen.next(true);
    this.groupToDelete = group;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.groupToDelete = undefined;
  }

  async deleteGroup() {
    let deleteGroupId: number = this.groupToDelete.id;
    let deleteGroupGuid: string = this.groupToDelete.guid;
    this.groupToDelete = undefined;
    this.loadingService.setLoadingMessage('Deleting Energy Use Group...')
    this.loadingService.setLoadingStatus(true);
    //delete groups
    await firstValueFrom(this.facilityEnergyUseGroupsDbService.deleteWithObservable(deleteGroupId));
    //delete equipment associated with group
    await this.facilityEnergyUseEquipmentDbService.deleteEnergyUseGroup(deleteGroupGuid);
    //set groups
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseGroups(account, selectedFacility);
    //set equipment
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(account, selectedFacility);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Energy Use Group Deleted", undefined, undefined, false, "alert-success");
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  goToEquipment(equipment: IdbFacilityEnergyUseEquipment) {
    this.router.navigateByUrl('data-management/' + equipment.accountId + '/facilities/' + equipment.facilityId + '/energy-uses/' + equipment.energyUseGroupId + '/equipment/' + equipment.guid);
  }
}
