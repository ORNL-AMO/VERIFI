import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { EditMeterFormService } from '../edit-meter-form/edit-meter-form.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ActivatedRoute, Router } from '@angular/router';

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
    private energyUnitsHelperService: EnergyUnitsHelperService, private editMeterFormService: EditMeterFormService,
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
        let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(this.editMeter, false);
        if (meterData.length != 0) {
          this.meterDataExists = true;
          this.meterForm.controls.source.disable();
          this.meterForm.controls.startingUnit.disable();
          this.meterForm.controls.phase.disable();
          this.meterForm.controls.fuel.disable();
          this.meterForm.controls.heatCapacity.disable();
          this.meterForm.controls.energyUnit.disable();
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
      await this.utilityMeterDbService.updateWithObservable(meterToSave).toPromise();
    } else if (this.addOrEdit == 'add') {
      delete meterToSave.id;
      meterToSave = await this.utilityMeterDbService.addWithObservable(meterToSave).toPromise();
    }
    await this.utilityMeterDbService.updateWithObservable(meterToSave);
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
    this.cancel();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Meter Saved!', undefined, undefined, false, "success");
  }

  cancel() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/facility/' + selectedFacility.id + '/utility/energy-consumption/energy-source/meters')
  }

  async checkMeterData() {
    let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(this.editMeter.source);
    let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(this.editMeter.startingUnit);
    //energy meter with data entered as consumption
    if (isEnergyMeter && !isEnergyUnit) {
      this.loadingService.setLoadingMessage('Updating Meter Data...')
      this.loadingService.setLoadingStatus(true);
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(this.editMeter, false);
      for (let i = 0; i < meterData.length; i++) {
        meterData[i].totalEnergyUse = meterData[i].totalVolume * this.meterForm.controls.heatCapacity.value;
        await this.utilityMeterDataDbService.updateWithObservable(meterData[i]).toPromise();
      }
      let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllByIndexRange("accountId", this.selectedFacility.accountId).toPromise();
      this.utilityMeterDataDbService.accountMeterData.next(accountMeterData);
      let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == this.selectedFacility.guid });
      this.utilityMeterDataDbService.facilityMeterData.next(facilityMeterData);
      this.toastNotificationService.showToast("Meter and Meter Data Updated", undefined, undefined, false, "success");
    }
  }
}
