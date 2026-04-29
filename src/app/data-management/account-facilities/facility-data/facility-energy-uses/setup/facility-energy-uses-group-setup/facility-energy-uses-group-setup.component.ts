import { Component, inject } from '@angular/core';
import { firstValueFrom, from, map, Observable, of, Subscription, switchAll, take } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbFacilityEnergyUseGroup, IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { ActivatedRoute, Router } from '@angular/router';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { FacilityEnergyUsesSetupService } from '../facility-energy-uses-setup.service';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';

@Component({
  selector: 'app-facility-energy-uses-group-setup',
  standalone: false,
  templateUrl: './facility-energy-uses-group-setup.component.html',
  styleUrl: './facility-energy-uses-group-setup.component.css'
})
export class FacilityEnergyUsesGroupSetupComponent {
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private loadingService: LoadingService = inject(LoadingService);
  private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService = inject(FacilityEnergyUseEquipmentDbService);
  private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService = inject(FacilityEnergyUseGroupsDbService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private toastNotificationsService: ToastNotificationsService = inject(ToastNotificationsService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private router: Router = inject(Router);
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private facilityEnergyUsesSetupService: FacilityEnergyUsesSetupService = inject(FacilityEnergyUsesSetupService);
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private routerGuardService: RouterGuardService = inject(RouterGuardService);

  facility: IdbFacility;
  facilitySub: Subscription;

  energyUseGroups: Array<IdbFacilityEnergyUseGroup & { equipment: Array<IdbFacilityEnergyUseEquipment> }>;
  groupSetupIndex: number = 0;

  groupsIdsToDelete: Array<IdbFacilityEnergyUseGroup> = [];
  showDeleteGroupModal: boolean = false;

  isNew: boolean;
  setupYear: number;

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe(params => {
      const setupYear: number = parseInt(params['setupYear']);
      if (setupYear) {
        this.setupYear = setupYear;
      }
    });
    this.isNew = this.router.url.includes('new-setup');
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
    if (this.isNew) {
      if (this.facilityEnergyUsesSetupService.newGroups && this.facilityEnergyUsesSetupService.setupYear) {
        for (let group of this.facilityEnergyUsesSetupService.newGroups) {
          let newGroup: IdbFacilityEnergyUseGroup = getNewIdbFacilityEnergyUseGroup(this.facility.accountId, this.facility.guid);
          newGroup.name = group.groupName;
          let equipmentArray: Array<IdbFacilityEnergyUseEquipment> = new Array();
          for (let i = 0; i < group.numberOfEquipment; i++) {
            let equipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(newGroup, this.facilityEnergyUsesSetupService.setupYear);
            equipment.name = 'Equipment ' + (i + 1);
            equipment.operatingConditionsData.forEach(operatingCondition => {
              operatingCondition.hoursOfOperation = group.operatingHours;
            });
            equipmentArray.push(equipment);
          }
          this.energyUseGroups.push({
            ...newGroup,
            equipment: equipmentArray
          });
        }
      } else {
        console.log('no setup info, going back to options');
        this.router.navigate(['../setup-options'], { relativeTo: this.activatedRoute });
      }
    } else {
      if (this.facilityEnergyUsesSetupService.existingGroupsToEdit) {
        let facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = this.facilityEnergyUseGroupsDbService.getByFacilityId(this.facility.guid);
        let equipment: Array<IdbFacilityEnergyUseEquipment> = this.facilityEnergyUseEquipmentDbService.getByFacilityId(this.facility.guid);
        this.facilityEnergyUsesSetupService.existingGroupsToEdit.forEach(groupId => {
          let group: IdbFacilityEnergyUseGroup = facilityEnergyUseGroups.find(group => group.guid == groupId);
          if (group) {
            let groupCopy: IdbFacilityEnergyUseGroup = _.cloneDeep(group);
            let equipmentForGroup: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.energyUseGroupId == group.guid);
            this.energyUseGroups.push({
              ...groupCopy,
              equipment: equipmentForGroup.map(equip => { return _.cloneDeep(equip); })
            });
          }
        });

      } else {
        console.log('no setup info, going back to options');
        this.router.navigate(['../setup-options'], { relativeTo: this.activatedRoute });
      }
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
        id: group.id,
        color: group.color
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

  startOver() {
    this.router.navigate(['../setup-options'], { relativeTo: this.activatedRoute });
  }


  canDeactivate(): Observable<boolean> {
    this.routerGuardService.setShowSave(false);
    this.routerGuardService.setShowModal(true);
    return this.routerGuardService.getModalAction().pipe(map(action => {
      if (action == 'discard') {
        return of(true);
      }
      return of(false);
    }),
      take(1), switchAll());
  }
}
