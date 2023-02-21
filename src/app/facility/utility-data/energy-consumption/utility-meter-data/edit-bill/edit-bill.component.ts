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
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { UtilityMeterDataService } from '../utility-meter-data.service';

@Component({
  selector: 'app-edit-bill',
  templateUrl: './edit-bill.component.html',
  styleUrls: ['./edit-bill.component.css']
})
export class EditBillComponent implements OnInit {

  editMeterData: IdbUtilityMeterData;
  addOrEdit: 'add' | 'edit';
  editMeter: IdbUtilityMeter;
  meterDataForm: FormGroup;
  displayVolumeInput: boolean;
  displayEnergyUse: boolean;
  invalidDate: boolean;
  showConfirmCancel: boolean = false;
  showFilterDropdown: boolean = false;
  constructor(private activatedRoute: ActivatedRoute, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService, private loadingService: LoadingService,
    private dbChangesService: DbChangesService, private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,
    private utilityMeterDataService: UtilityMeterDataService, private toastNotificationService: ToastNotificationsService,
    private energyUnitsHelperService: EnergyUnitsHelperService, private router: Router) { }

  ngOnInit(): void {
    this.activatedRoute.parent.params.subscribe(parentParams => {
      let meterId: number = parseInt(parentParams['id']);
      let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
      this.editMeter = accountMeters.find(meter => { return meter.id == meterId });
      this.activatedRoute.params.subscribe(params => {
        let meterReadingId: number = parseInt(params['id']);
        if (meterReadingId) {
          //existing reading
          this.addOrEdit = 'edit';
          let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
          this.editMeterData = accountMeterData.find(data => { return data.id == meterReadingId });
        } else {
          //new Reading
          this.editMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(this.editMeter);
          this.addOrEdit = 'add';
        }
        this.setMeterDataForm();
      })
    })
  }


  cancel(onSave?: boolean) {
    if(!this.meterDataForm.dirty || onSave){
      this.confirmCancel();
    }else{
      this.showConfirmCancel = true;
    }
  }

  confirmCancel(){
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/facility/' + selectedFacility.id + '/utility/energy-consumption/utility-meter/' + this.editMeter.id + '/data-table');
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
      await this.utilityMeterDataDbService.updateWithObservable(meterDataToSave).toPromise();
    } else {
      delete meterDataToSave.id;
      meterDataToSave = await this.utilityMeterDataDbService.addWithObservable(meterDataToSave).toPromise();
    }
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeterData(selectedAccount, selectedFacility);
    this.cancel(true);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Reading Saved!', undefined, undefined, false, "bg-success");
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
    meterDataToSave = await this.utilityMeterDataDbService.addWithObservable(meterDataToSave).toPromise();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeterData(selectedAccount, selectedFacility);
    this.editMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(this.editMeter);
    this.editMeterData.readDate = new Date(meterDataToSave.readDate);
    this.editMeterData.readDate.setMonth(this.editMeterData.readDate.getUTCMonth() + 1);
    this.setMeterDataForm();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Reading Saved!', undefined, undefined, false, "bg-success");
  }


  setMeterDataForm() {
    if (this.editMeter.source == 'Electricity') {
      this.meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(this.editMeterData);
    } else {
      this.displayVolumeInput = (this.energyUnitsHelperService.isEnergyUnit(this.editMeter.startingUnit) == false);
      this.displayEnergyUse = this.energyUnitsHelperService.isEnergyMeter(this.editMeter.source);
      this.meterDataForm = this.utilityMeterDataService.getGeneralMeterDataForm(this.editMeterData, this.displayVolumeInput, this.displayEnergyUse);
      if (this.displayVolumeInput) {
        this.meterDataForm.controls.totalEnergyUse.disable();
      }
    }

    this.meterDataForm.valueChanges.subscribe(() => {
      this.showConfirmCancel = false;
    })
  }

  toggleFilterMenu(){
    this.showFilterDropdown = !this.showFilterDropdown;
  }
}
