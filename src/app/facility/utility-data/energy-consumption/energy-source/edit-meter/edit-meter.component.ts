import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { EditMeterFormService } from '../edit-meter-form/edit-meter-form.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ActivatedRoute, Router } from '@angular/router';
import { getIsEnergyMeter, getIsEnergyUnit } from 'src/app/shared/sharedHelperFuntions';
import { Observable, firstValueFrom, of } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-edit-meter',
  templateUrl: './edit-meter.component.html',
  styleUrls: ['./edit-meter.component.css']
})
export class EditMeterComponent implements OnInit {


  meterForm: FormGroup;
  meterDataExists: boolean;
  editMeter: IdbUtilityMeter;
  addOrEdit: 'add' | 'edit';
  selectedFacility: IdbFacility;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService,
    private editMeterFormService: EditMeterFormService,
    private utilityMeterDataDbService: UtilityMeterDatadbService, private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService, private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService, private activatedRoute: ActivatedRoute,
    private router: Router) { }

  ngOnInit(): void {
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      if (meterId) {
        this.addOrEdit = 'edit';
        this.editMeter = facilityMeters.find(meter => { return meter.guid == meterId });
        this.meterForm = this.editMeterFormService.getFormFromMeter(this.editMeter);
        let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.editMeter.guid);
        if (meterData.length != 0) {
          this.meterDataExists = true;
          this.meterForm.controls.source.disable();
          this.meterForm.controls.startingUnit.disable();
          this.meterForm.controls.phase.disable();
          this.meterForm.controls.fuel.disable();
          this.meterForm.controls.heatCapacity.disable();
          this.meterForm.controls.energyUnit.disable();

          this.meterForm.controls.scope.disable();

          this.meterForm.controls.waterIntakeType.disable();
          this.meterForm.controls.waterDischargeType.disable();

          this.meterForm.controls.vehicleCategory.disable();
          this.meterForm.controls.vehicleType.disable();
          this.meterForm.controls.vehicleCollectionType.disable();
          this.meterForm.controls.vehicleCollectionUnit.disable();
          this.meterForm.controls.vehicleFuel.disable();
          this.meterForm.controls.vehicleFuelEfficiency.disable();
          this.meterForm.controls.vehicleDistanceUnit.disable();
          

        }
      } else {
        this.addOrEdit = 'add';
        this.editMeter = this.utilityMeterDbService.getNewIdbUtilityMeter(this.selectedFacility.guid, this.selectedFacility.accountId, true, this.selectedFacility.electricityUnit);
        this.meterForm = this.editMeterFormService.getFormFromMeter(this.editMeter);
      }
    });
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Saving Meter...');
    this.loadingService.setLoadingStatus(true);
    //if data exists. See if you need to re-calculate energy
    if (this.meterDataExists && (this.editMeter.startingUnit != this.meterForm.controls.startingUnit.value) || (this.editMeter.heatCapacity != this.meterForm.controls.heatCapacity.value)) {
      await this.checkMeterData();
    }
    let meterToSave: IdbUtilityMeter = this.editMeterFormService.updateMeterFromForm(this.editMeter, this.meterForm);
    if (this.addOrEdit == 'edit') {
      await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meterToSave));
    } else if (this.addOrEdit == 'add') {
      delete meterToSave.id;
      meterToSave = await firstValueFrom(this.utilityMeterDbService.addWithObservable(meterToSave));
    }
    await this.utilityMeterDbService.updateWithObservable(meterToSave);
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
    this.meterForm.markAsPristine();
    this.cancel();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Meter Saved!', undefined, undefined, false, "alert-success");
  }

  cancel() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/facility/' + selectedFacility.id + '/utility/energy-consumption/energy-source/meters')
  }

  async checkMeterData() {
    let isEnergyMeter: boolean = getIsEnergyMeter(this.editMeter.source);
    let isEnergyUnit: boolean = getIsEnergyUnit(this.editMeter.startingUnit);
    //energy meter with data entered as consumption
    if (isEnergyMeter && !isEnergyUnit) {
      this.loadingService.setLoadingMessage('Updating Meter Data...')
      this.loadingService.setLoadingStatus(true);
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.editMeter.guid);
      for (let i = 0; i < meterData.length; i++) {
        meterData[i].totalEnergyUse = meterData[i].totalVolume * this.meterForm.controls.heatCapacity.value;
        await firstValueFrom(this.utilityMeterDataDbService.updateWithObservable(meterData[i]));
      }
      let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllAccountMeterData(this.selectedFacility.accountId);
      this.utilityMeterDataDbService.accountMeterData.next(accountMeterData);
      let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == this.selectedFacility.guid });
      this.utilityMeterDataDbService.facilityMeterData.next(facilityMeterData);
      this.toastNotificationService.showToast("Meter and Meter Data Updated", undefined, undefined, false, "alert-success");
    }
  }
  
  canDeactivate(): Observable<boolean> {
    if (this.meterForm.dirty) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }
}
