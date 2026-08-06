import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { EnergyUseCommandHandler } from 'src/app/account-workspace/handlers/energy-use-command-handler.service';
import { Component, inject, Injector } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, Observable, of, Subscription, switchAll, take } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityEnergyUsesSetupService } from '../facility-energy-uses-setup.service';
import { EnergyEquipmentOperatingConditionsData, EquipmentUtilityDataEnergyUse, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import * as _ from 'lodash';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';

@Component({
  selector: 'app-facility-energy-uses-modify-annual-data',
  standalone: false,
  templateUrl: './facility-energy-uses-modify-annual-data.component.html',
  styleUrl: './facility-energy-uses-modify-annual-data.component.css',
})
export class FacilityEnergyUsesModifyAnnualDataComponent {
  constructor(private injector: Injector) { }

  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly energyUseHandler = inject(EnergyUseCommandHandler);
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private facilityEnergyUsesSetupService: FacilityEnergyUsesSetupService = inject(FacilityEnergyUsesSetupService);
  private router: Router = inject(Router);
  private loadingService: LoadingService = inject(LoadingService);
  private toastNotificationsService: ToastNotificationsService = inject(ToastNotificationsService);
  private routerGuardService: RouterGuardService = inject(RouterGuardService);

  selectedYear: number;
  facility: IdbFacility;
  facilitySub: Subscription;

  energyUseGroups: Array<IdbFacilityEnergyUseGroup & { equipment: Array<IdbFacilityEnergyUseEquipment> }>;
  groupSetupIndex: number = 0;
  routingAfterSubmit: boolean = false;

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      this.selectedYear = parseInt(params['year']);
    });
    this.facilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(facility => {
      this.facility = facility;
    });
    this.initEnergyUseGroups();
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
  }

  initEnergyUseGroups() {
    this.groupSetupIndex = 0;
    this.energyUseGroups = new Array();
    if (this.facilityEnergyUsesSetupService.existingGroupsToEdit) {
      let facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = this.accountWorkspaceQuery.getFacilityEnergyUseGroups(this.facility.guid);
      let equipment: Array<IdbFacilityEnergyUseEquipment> = this.accountWorkspaceQuery.getFacilityEnergyUseEquipment(this.facility.guid);
      this.facilityEnergyUsesSetupService.existingGroupsToEdit.forEach(groupId => {
        let group: IdbFacilityEnergyUseGroup = facilityEnergyUseGroups.find(group => group.guid == groupId);
        if (group) {
          let groupCopy: IdbFacilityEnergyUseGroup = _.cloneDeep(group);
          let equipmentForGroup: Array<IdbFacilityEnergyUseEquipment> = equipment.filter(equip => equip.energyUseGroupId == group.guid);
          let equipmentForGroupCopy: Array<IdbFacilityEnergyUseEquipment> = equipmentForGroup.map(equip => { return _.cloneDeep(equip); });
          //add year to equipment that doesn't have data for the year
          for (let equipment of equipmentForGroupCopy) {
            if (equipment.utilityData.length > 0 && equipment.operatingConditionsData?.length > 0) {
              let checkHasDataForYear: EnergyEquipmentOperatingConditionsData = equipment.operatingConditionsData.find(data => data.year == this.selectedYear);
              if (!checkHasDataForYear) {
                let mostRecentYearOfData: number = Math.max(...equipment.operatingConditionsData.map(data => data.year));
                let mostRecentData: EnergyEquipmentOperatingConditionsData = equipment.operatingConditionsData.find(data => data.year == mostRecentYearOfData);
                let newData: EnergyEquipmentOperatingConditionsData = {
                  ...mostRecentData,
                  year: this.selectedYear
                }
                equipment.operatingConditionsData.push(newData);
                equipment.utilityData.forEach(utility => {
                  let mostRecentYearOfUtilityData: EquipmentUtilityDataEnergyUse = utility.energyUse.find(data => data.year == mostRecentYearOfData);
                  if (mostRecentYearOfUtilityData) {
                    utility.energyUse.push({ year: this.selectedYear, energyUse: mostRecentYearOfUtilityData.energyUse, overrideEnergyUse: false, energyUseUnit: mostRecentYearOfUtilityData.energyUseUnit });
                  }
                })
              }
            }
          }
          this.energyUseGroups.push({
            ...groupCopy,
            equipment: equipmentForGroupCopy
          });
        }
      });

    } else {
      console.log('no setup info, going back to options');
      this.router.navigate(['../../setup-options'], { relativeTo: this.activatedRoute });
    }
  }

  previousGroup() {
    if (this.groupSetupIndex > 0) {
      this.groupSetupIndex--;
    }
  }

  nextGroup() {
    if (this.groupSetupIndex < this.energyUseGroups.length - 1) {
      this.groupSetupIndex++;
    }
  }

  async finalizeSetup() {
    this.loadingService.setLoadingMessage('Updating Energy Use Groups and Equipment...');
    this.loadingService.setLoadingStatus(true);
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'energyUseGroup', changeKind: 'bulk', label: 'Updating energy use groups and equipment' },
      async () => {
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
            newGroup = await this.energyUseHandler.addGroup(newGroup);
          } else {
            await this.energyUseHandler.updateGroup(newGroup, activeAccountGuid);
          }
          for (let equipment of group.equipment) {
            if (!equipment.id) {
              await this.energyUseHandler.addEquipment(equipment);
            } else {
              await this.energyUseHandler.updateEquipment(equipment, activeAccountGuid);
            }
          }
        }
      }
    );
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Energy Use Groups and Equipment Updated", undefined, undefined, false, "alert-success");
    this.routingAfterSubmit = true;
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses');
  }


  leaveGroupSetup() {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses');
  }

  canDeactivate(): Observable<boolean> {
    if (!this.routingAfterSubmit) {
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
    return of(true);
  }
}
