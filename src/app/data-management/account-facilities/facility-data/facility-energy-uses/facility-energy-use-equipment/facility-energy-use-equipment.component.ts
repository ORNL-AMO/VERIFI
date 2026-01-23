import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { EquipmentType, IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import * as _ from 'lodash';
import { EquipmentTypes } from '../calculations/equipmentTypes';

@Component({
  selector: 'app-facility-energy-use-equipment',
  standalone: false,
  templateUrl: './facility-energy-use-equipment.component.html',
  styleUrl: './facility-energy-use-equipment.component.css'
})
export class FacilityEnergyUseEquipmentComponent {

  equipmentTypes: Array<EquipmentType> = EquipmentTypes;
  energyUseEquipment: IdbFacilityEnergyUseEquipment;
  showDeleteEquipment: boolean = false;
  dataChanged: boolean = false;
  constructor(private activatedRoute: ActivatedRoute,
    private facilityDbService: FacilitydbService,
    private router: Router,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService,
    private sharedDataService: SharedDataService,
    private loadingService: LoadingService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private toastNotificationsService: ToastNotificationsService
  ) {
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let equipmentId: string = params['equipmentId'];
      let energyUseEquipment: IdbFacilityEnergyUseEquipment = this.facilityEnergyUseEquipmentDbService.getByGuid(equipmentId);
      if (energyUseEquipment) {
        //create copy
        this.energyUseEquipment = _.cloneDeep(energyUseEquipment);
      } else {
        this.goToGroupList();
      }
    });
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Saving Meter...');
    this.loadingService.setLoadingStatus(true);
    await firstValueFrom(this.facilityEnergyUseEquipmentDbService.updateWithObservable(this.energyUseEquipment));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(selectedAccount, selectedFacility);
    this.loadingService.setLoadingStatus(false);
    this.dataChanged = false;
  }

  showDelete() {
    this.sharedDataService.modalOpen.next(true);
    this.showDeleteEquipment = true;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showDeleteEquipment = false;
  }

  async deleteEquipment() {
    this.showDeleteEquipment = false;
    this.loadingService.setLoadingMessage('Deleting Energy Use Equipment...')
    this.loadingService.setLoadingStatus(true);
    //delete equipment
    await firstValueFrom(this.facilityEnergyUseEquipmentDbService.deleteWithObservable(this.energyUseEquipment.id));
    //set equipment
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityEnergyUseEquipment(account, selectedFacility);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Energy Use Equipment Deleted", undefined, undefined, false, "alert-success");
    this.goToGroupList();
  }

  goToGroupList() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/facilities/' + selectedFacility.guid + '/energy-uses/' + this.energyUseEquipment.energyUseGroupId);
  }

  canDeactivate(): Observable<boolean> {
    if (this.dataChanged) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }

  setDataChanged(updatedEquipment: IdbFacilityEnergyUseEquipment) {
    this.energyUseEquipment = updatedEquipment;
    this.dataChanged = true;
  }
}
