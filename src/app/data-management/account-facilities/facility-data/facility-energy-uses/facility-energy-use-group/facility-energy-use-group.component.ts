import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Signal, computed } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, from, map, Observable, of, switchAll, take } from 'rxjs';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { FacilityEnergyUseGroupFormService } from './facility-energy-use-group-form.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AllSources, MeterSource } from 'src/app/models/constantsAndTypes';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getLatestYearWithData } from 'src/app/calculations/shared-calculations/calculationsHelpers';

@Component({
  selector: 'app-facility-energy-use-group',
  standalone: false,
  templateUrl: './facility-energy-use-group.component.html',
  styleUrl: './facility-energy-use-group.component.css'
})
export class FacilityEnergyUseGroupComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService = inject(FacilityEnergyUseEquipmentDbService);
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService = inject(FacilityEnergyUseGroupsDbService);
  private facilityEnergyUseGroupFormService: FacilityEnergyUseGroupFormService = inject(FacilityEnergyUseGroupFormService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private loadingService: LoadingService = inject(LoadingService);
  private toastNotificationsService: ToastNotificationsService = inject(ToastNotificationsService);
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private routerGuardService: RouterGuardService = inject(RouterGuardService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);

  facilityEnergyUseEquipment: Signal<Array<IdbFacilityEnergyUseEquipment>> = computed(() => [...this.accountWorkspaceStore.facilityEnergyUseEquipment()]);
  facilityEnergyUseGroups: Signal<Array<IdbFacilityEnergyUseGroup>> = computed(() => [...this.accountWorkspaceStore.facilityEnergyUseGroups()]);

  get hasSelectedEquipment(): boolean {
    return this.facilityEnergyUseEquipment().some(equip => equip.selected);
  }

  get selectedEquipment(): Array<IdbFacilityEnergyUseEquipment> {
    return this.facilityEnergyUseEquipment().filter(equip => equip.selected);
  }

  get transferGroupOptions(): Array<IdbFacilityEnergyUseGroup> {
    let currentGroupId = this.energyUseGroup.guid;
    return this.facilityEnergyUseGroups().filter(group => group.guid !== currentGroupId);
  }


  energyUseGroup: IdbFacilityEnergyUseGroup;
  form: FormGroup;
  showDeleteGroup: boolean = false;
  sourceOptions: Array<MeterSource> = AllSources;
  showBulkTransfer: boolean = false;
  showBulkDelete: boolean = false;
  selectedTransferGroupId: string;

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let groupId: string = params['id'];
      this.energyUseGroup = this.accountWorkspaceQuery.getEnergyUseGroupByGuid(groupId);
      if (this.energyUseGroup) {
        this.form = this.facilityEnergyUseGroupFormService.getFormFromEnergyUseGroup(this.energyUseGroup);
      } else {
        this.goToGroupList();
      }
    });
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Saving Meter...');
    this.loadingService.setLoadingStatus(true);
    this.form.markAsPristine();
    this.energyUseGroup = this.facilityEnergyUseGroupFormService.updateEnergyUseGroupFromForm(this.energyUseGroup, this.form);
    await firstValueFrom(this.facilityEnergyUseGroupsDbService.updateWithObservable(this.energyUseGroup));
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.loadingService.setLoadingStatus(false);
  }

  showDelete() {
    this.sharedDataService.modalOpen.next(true);
    this.showDeleteGroup = true;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showDeleteGroup = false;
  }

  async deleteGroup() {
    this.showDeleteGroup = false;
    this.form.markAsPristine();
    this.loadingService.setLoadingMessage('Deleting Energy Use Group...')
    this.loadingService.setLoadingStatus(true);
    //delete groups
    await firstValueFrom(this.facilityEnergyUseGroupsDbService.deleteWithObservable(this.energyUseGroup.id));
    //delete equipment associated with group
    await this.facilityEnergyUseEquipmentDbService.deleteEnergyUseGroup(this.energyUseGroup.guid);
    //set groups
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    let account: IdbAccount = this.accountWorkspaceStore.account();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    //set equipment
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Energy Use Group Deleted", undefined, undefined, false, "alert-success");
    this.goToGroupList();
  }

  goToGroupList() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses')
  }

  canDeactivate(): Observable<boolean> {
    if (this.form && this.form.dirty) {
      this.routerGuardService.setShowSave(true);
      this.routerGuardService.setShowModal(true);
      return this.routerGuardService.getModalAction().pipe(map(action => {
        if (action == 'save') {
          return from(this.saveChanges()).pipe(map(() => true));
        } else if (action == 'discard') {
          return of(true);
        }
        return of(false);
      }),
        take(1), switchAll());
    }
    return of(true);
  }

  async addEquipment() {
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.calanderizedMeters.getValue();
    let facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    let latestYear: number = getLatestYearWithData(calanderizedMeters, [facility]);
    let newEquipment: IdbFacilityEnergyUseEquipment = getNewIdbFacilityEnergyUseEquipment(this.energyUseGroup, latestYear);
    await firstValueFrom(this.facilityEnergyUseEquipmentDbService.addWithObservable(newEquipment));
    let account: IdbAccount = this.accountWorkspaceStore.account();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + facility.guid + '/energy-uses/' + this.energyUseGroup.guid + '/equipment/' + newEquipment.guid);
  }

  openBulkTransfer() {
    this.showBulkTransfer = true;
  }

  async confirmBulkTransfer() {
    this.loadingService.setLoadingMessage('Transferring Equipment...');
    this.loadingService.setLoadingStatus(true);
    //create copy of selected equipment to modify selected before saving
    let _selectedEquipment: Array<IdbFacilityEnergyUseEquipment> = this.selectedEquipment.map(equipment => { return { ...equipment } });
    for (let i = 0; i < _selectedEquipment.length; i++) {
      let equipment = _selectedEquipment[i];
      equipment.energyUseGroupId = this.selectedTransferGroupId;
      equipment.selected = false;
      await firstValueFrom(this.facilityEnergyUseEquipmentDbService.updateWithObservable(equipment));
    }
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.showBulkTransfer = false;
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Equipment Transferred", undefined, undefined, false, "alert-success");
  }

  cancelBulkTransfer() {
    let facilityEnergyUseEquipment = this.facilityEnergyUseEquipment();
    for (let i = 0; i < facilityEnergyUseEquipment.length; i++) {
      facilityEnergyUseEquipment[i].selected = false;
    }
    this.showBulkTransfer = false;
  }

  openBulkDelete() {
    this.showBulkDelete = true;
  }

  async confirmBulkDelete() {
    this.loadingService.setLoadingMessage('Deleting Equipment...');
    this.loadingService.setLoadingStatus(true);
    for (let i = 0; i < this.selectedEquipment.length; i++) {
      await firstValueFrom(this.facilityEnergyUseEquipmentDbService.deleteWithObservable(this.selectedEquipment[i].id));
    }
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.showBulkDelete = false;
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Equipment Deleted", undefined, undefined, false, "alert-success");
  }

  cancelBulkDelete() {
    let facilityEnergyUseEquipment = this.facilityEnergyUseEquipment();
    for (let i = 0; i < facilityEnergyUseEquipment.length; i++) {
      facilityEnergyUseEquipment[i].selected = false;
    }
    this.showBulkDelete = false;
  }
}
