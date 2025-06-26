import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { checkShowHeatCapacity, getIsEnergyMeter, getIsEnergyUnit } from 'src/app/shared/sharedHelperFuntions';
import { firstValueFrom, Observable, of, Subscription } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeterData, IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';

@Component({
  selector: 'app-edit-bill',
  templateUrl: './edit-bill.component.html',
  styleUrls: ['./edit-bill.component.css'],
  standalone: false
})
export class EditBillComponent implements OnInit {

  editMeterData: IdbUtilityMeterData;
  addOrEdit: 'add' | 'edit';
  editMeter: IdbUtilityMeter;
  meterDataForm: FormGroup;
  displayVolumeInput: boolean;
  displayEnergyUse: boolean;
  displayHeatCapacity: boolean;
  displayVehicleFuelEfficiency: boolean;
  invalidDate: boolean;
  showFilterDropdown: boolean = false;
  inDataWizard: boolean;
  paramsSub: Subscription;
  constructor(private activatedRoute: ActivatedRoute, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService, private loadingService: LoadingService,
    private dbChangesService: DbChangesService, private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,
    private utilityMeterDataService: UtilityMeterDataService, private toastNotificationService: ToastNotificationsService,
    private router: Router) { }

  ngOnInit(): void {
    this.setInDataWizard();
    this.paramsSub = this.activatedRoute.parent.params.subscribe(parentParams => {
      let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
      if (this.inDataWizard) {
        let meterId: string = parentParams['id'];
        this.editMeter = accountMeters.find(meter => { return meter.guid == meterId });
      } else {
        let meterId: number = parseInt(parentParams['id']);
        this.editMeter = accountMeters.find(meter => { return meter.id == meterId });
      }
      this.setDisplayHeatCapacity();
      this.activatedRoute.params.subscribe(params => {
        if (this.inDataWizard) {
          let meterReadingId: string = params['id'];
          if (meterReadingId) {
            //existing reading
            this.addOrEdit = 'edit';
            let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
            this.editMeterData = accountMeterData.find(data => { return data.guid == meterReadingId });
          } else {
            //new Reading
            let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
            this.editMeterData = getNewIdbUtilityMeterData(this.editMeter, accountMeterData);
            this.addOrEdit = 'add';
          }
        } else {
          let meterReadingId: number = parseInt(params['id']);
          if (meterReadingId) {
            //existing reading
            this.addOrEdit = 'edit';
            let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
            this.editMeterData = accountMeterData.find(data => { return data.id == meterReadingId });
          } else {
            //new Reading
            let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
            this.editMeterData = getNewIdbUtilityMeterData(this.editMeter, accountMeterData);
            this.addOrEdit = 'add';
          }
        }
        this.setMeterDataForm();
      })
    })
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  setInDataWizard() {
    this.inDataWizard = this.router.url.includes('data-wizard');
  }

  cancel() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (this.inDataWizard) {
      this.router.navigateByUrl('/data-wizard/' + this.editMeter.accountId + '/facilities/' + this.editMeter.facilityId + '/meters/' + this.editMeter.guid + '/meter-data');
    } else {
      this.router.navigateByUrl('/facility/' + selectedFacility.id + '/utility/energy-consumption/utility-meter/' + this.editMeter.id + '/data-table');
    }
  }

  async saveAndQuit() {
    this.loadingService.setLoadingMessage('Saving Reading...');
    this.loadingService.setLoadingStatus(true);
    let meterDataToSave: IdbUtilityMeterData;
    if (this.editMeter.source == 'Electricity') {
      meterDataToSave = this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm);
    } else {
      meterDataToSave = this.utilityMeterDataService.updateGeneralMeterDataFromForm(this.editMeterData, this.meterDataForm);
    }
    if (this.addOrEdit == 'edit') {
      await firstValueFrom(this.utilityMeterDataDbService.updateWithObservable(meterDataToSave));
    } else {
      delete meterDataToSave.id;
      meterDataToSave = await firstValueFrom(this.utilityMeterDataDbService.addWithObservable(meterDataToSave));
    }
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeterData(selectedAccount, selectedFacility);
    this.meterDataForm.markAsPristine();
    this.cancel();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Reading Saved!', undefined, undefined, false, "alert-success");
  }

  async saveAndAddAnother() {
    this.loadingService.setLoadingMessage('Saving Reading...');
    this.loadingService.setLoadingStatus(true);
    let meterDataToSave: IdbUtilityMeterData;
    if (this.editMeter.source == 'Electricity') {
      meterDataToSave = this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm);
    } else {
      meterDataToSave = this.utilityMeterDataService.updateGeneralMeterDataFromForm(this.editMeterData, this.meterDataForm);
    }

    delete meterDataToSave.id;
    meterDataToSave = await firstValueFrom(this.utilityMeterDataDbService.addWithObservable(meterDataToSave));
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeterData(selectedAccount, selectedFacility);
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    this.editMeterData = getNewIdbUtilityMeterData(this.editMeter, accountMeterData);
    this.editMeterData.readDate = new Date(meterDataToSave.readDate);
    this.editMeterData.readDate.setMonth(this.editMeterData.readDate.getUTCMonth() + 1);
    this.setMeterDataForm();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Reading Saved!', undefined, undefined, false, "alert-success");
  }


  setMeterDataForm() {
    if (this.editMeter.source == 'Electricity') {
      this.meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(this.editMeterData);
    } else if (this.editMeter.source == 'Other') {
      this.displayVolumeInput = (getIsEnergyUnit(this.editMeter.startingUnit) == false);
      this.displayEnergyUse = (getIsEnergyUnit(this.editMeter.startingUnit) == true);
      this.meterDataForm = this.utilityMeterDataService.getGeneralMeterDataForm(this.editMeterData, this.displayVolumeInput, this.displayEnergyUse, this.displayHeatCapacity, false, this.editMeter.source);
    } else {
      this.displayVolumeInput = (getIsEnergyUnit(this.editMeter.startingUnit) == false);
      this.displayEnergyUse = getIsEnergyMeter(this.editMeter.source);
      this.displayVehicleFuelEfficiency = (this.editMeter.scope == 2 && this.editMeter.vehicleCategory == 2);
      this.meterDataForm = this.utilityMeterDataService.getGeneralMeterDataForm(this.editMeterData, this.displayVolumeInput, this.displayEnergyUse, this.displayHeatCapacity, this.displayVehicleFuelEfficiency, this.editMeter.source);
      if (this.displayVolumeInput) {
        this.meterDataForm.controls.totalEnergyUse.disable();
      }
      if (this.displayHeatCapacity && this.meterDataForm.controls.heatCapacity.value == undefined) {
        this.meterDataForm.controls.heatCapacity.patchValue(this.editMeter.heatCapacity);
      }
    }
  }

  toggleFilterMenu() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }


  canDeactivate(): Observable<boolean> {
    if (this.meterDataForm.dirty) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }

  setDisplayHeatCapacity() {
    this.displayHeatCapacity = checkShowHeatCapacity(this.editMeter.source, this.editMeter.startingUnit, this.editMeter.scope);
  }
}
