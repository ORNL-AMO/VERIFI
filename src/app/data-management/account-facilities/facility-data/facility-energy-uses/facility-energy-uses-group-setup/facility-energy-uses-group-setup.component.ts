import { Component } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { EquipmentType, getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbFacilityEnergyUseGroup, IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { EquipmentTypes } from '../calculations/equipmentTypes';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { Router } from '@angular/router';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

@Component({
  selector: 'app-facility-energy-uses-group-setup',
  standalone: false,
  templateUrl: './facility-energy-uses-group-setup.component.html',
  styleUrl: './facility-energy-uses-group-setup.component.css'
})
export class FacilityEnergyUsesGroupSetupComponent {

  facility: IdbFacility;
  facilitySub: Subscription;

  energyUseGroups: Array<IdbFacilityEnergyUseGroup & { equipment: Array<IdbFacilityEnergyUseEquipment> }>;
  groupSetupIndex: number = 0;
  equipmentTypes: Array<EquipmentType> = EquipmentTypes;

  groupsIdsToDelete: Array<IdbFacilityEnergyUseGroup> = [];
  showDeleteGroupModal: boolean = false;
  constructor(private facilityDbService: FacilitydbService,
    private loadingService: LoadingService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private dbChangesService: DbChangesService,
    private toastNotificationsService: ToastNotificationsService,
    private accountDbService: AccountdbService,
    private router: Router,
    private utilityMeterDataDbService: UtilityMeterDatadbService
  ) { }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });
    this.initEnergyUseGroups();
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
  }

  initEnergyUseGroups() {
    this.groupsIdsToDelete = new Array();
    this.groupSetupIndex = 0;
    this.energyUseGroups = new Array();
    let facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = this.facilityEnergyUseGroupsDbService.getByFacilityId(this.facility.guid);
    if (facilityEnergyUseGroups.length == 0) {
      //add initial groups
      let newGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(this.facility.accountId, this.facility.guid);
      newGroup.name = 'Group ' + (this.energyUseGroups.length + 1);
      let facilityMeterDataYears: { endYear: number } = this.utilityMeterDataDbService.getStartEndYearsForFacility(this.facility.guid);
      let equipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(newGroup, facilityMeterDataYears.endYear);
      this.energyUseGroups.push({
        ...newGroup,
        equipment: [equipment]
      });
    } else {
      let facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = this.facilityEnergyUseEquipmentDbService.getByFacilityId(this.facility.guid);
      for (let group of facilityEnergyUseGroups) {
        let equipmentForGroup: Array<IdbFacilityEnergyUseEquipment> = facilityEnergyUseEquipment.filter(equip => { return equip.energyUseGroupId == group.guid });
        let groupCopy: IdbFacilityEnergyUseGroup = _.cloneDeep(group);
        this.energyUseGroups.push({
          ...groupCopy,
          equipment: equipmentForGroup.map(equip => { return _.cloneDeep(equip); })
        });
      };
    }
  }

  nextGroup() {
    this.groupSetupIndex++;
  }

  previousGroup() {
    this.groupSetupIndex--;
  }

  async finalizeSetup() {
    this.loadingService.setLoadingMessage('Adding Energy Use Groups and Equipment...');
    this.loadingService.setLoadingStatus(true);
    for (let group of this.energyUseGroups) {
      let newGroup: IdbFacilityEnergyUseGroup = {
        accountId: group.accountId,
        facilityId: group.facilityId,
        guid: group.guid,
        name: group.name,
        notes: group.notes,
        sidebarOpen: false,
        modifiedDate: group.modifiedDate,
        createdDate: group.createdDate,
        id: group.id
      };
      if (!newGroup.id) {
        delete newGroup.id;
        newGroup = await firstValueFrom(this.facilityEnergyUseGroupsDbService.addWithObservable(newGroup));
      } else {
        await firstValueFrom(this.facilityEnergyUseGroupsDbService.updateWithObservable(newGroup));
      }
      for (let equipment of group.equipment) {
        if (!equipment.id) {
          await firstValueFrom(this.facilityEnergyUseEquipmentDbService.addWithObservable(equipment));
        } else {
          await firstValueFrom(this.facilityEnergyUseEquipmentDbService.updateWithObservable(equipment));
        }
      }
    }
    for (let group of this.groupsIdsToDelete) {
      //delete groups
      await firstValueFrom(this.facilityEnergyUseGroupsDbService.deleteWithObservable(group.id));
      //delete equipment associated with group
      await this.facilityEnergyUseEquipmentDbService.deleteEnergyUseGroup(group.guid);
    }
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseGroups(account, this.facility);
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(account, this.facility);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Energy Use Groups and Equipment Added", undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses');
  }

  addGroup() {
    let newGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(this.facility.accountId, this.facility.guid);
    newGroup.name = 'Group ' + (this.energyUseGroups.length + 1);
    let facilityMeterDataYears: { endYear: number } = this.utilityMeterDataDbService.getStartEndYearsForFacility(this.facility.guid);
    let equipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(newGroup, facilityMeterDataYears.endYear);
    this.energyUseGroups.push({
      ...newGroup,
      equipment: [equipment]
    });
    this.nextGroup();
  }

  removeEquipment(index: number) {
    this.energyUseGroups[this.groupSetupIndex].equipment.splice(index, 1);
  }

  addEquipmentForm() {
    let currentGroup = this.energyUseGroups[this.groupSetupIndex];
    let facilityMeterDataYears: { endYear: number } = this.utilityMeterDataDbService.getStartEndYearsForFacility(this.facility.guid);
    let newEquipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(currentGroup, facilityMeterDataYears.endYear);
    currentGroup.equipment.push(newEquipment);
  }

  dataChanged(equipment: IdbFacilityEnergyUseEquipment) {
    let group = this.energyUseGroups[this.groupSetupIndex];
    let index = group.equipment.findIndex(equip => { return equip.guid == equipment.guid });
    if (index != -1) {
      group.equipment[index] = equipment;
    }
  }

  openDeleteGroupModal() {
    this.showDeleteGroupModal = true;
  }

  closeDeleteGroupModal() {
    this.showDeleteGroupModal = false;
  }

  confirmDeleteGroup() {
    let groupToDelete: Array<IdbFacilityEnergyUseGroup> = this.energyUseGroups.splice(this.groupSetupIndex, 1);
    if (groupToDelete[0].id) {
      this.groupsIdsToDelete.push(groupToDelete[0]);
    }
    if (this.groupSetupIndex > 0) {
      this.groupSetupIndex--;
    }
    this.closeDeleteGroupModal();
  }

  leaveGroupSetup() {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses');
  }
}
