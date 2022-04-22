import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { EditMeterFormService } from '../edit-meter-form/edit-meter-form.service';

@Component({
  selector: 'app-edit-meter',
  templateUrl: './edit-meter.component.html',
  styleUrls: ['./edit-meter.component.css']
})
export class EditMeterComponent implements OnInit {
  @Input()
  editMeter: IdbUtilityMeter;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input()
  addOrEdit: string;

  meterForm: FormGroup;
  meterDataExists: boolean;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService,
    private energyUnitsHelperService: EnergyUnitsHelperService, private editMeterFormService: EditMeterFormService,
    private utilityMeterDataDbService: UtilityMeterDatadbService, private loadingService: LoadingService,
    private toastNoticationService: ToastNotificationsService) { }

  ngOnInit(): void {
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
  }

  async saveChanges() {
    //if data exists. See if you need to re-calculate energy
    if (this.meterDataExists && (this.editMeter.startingUnit != this.meterForm.controls.startingUnit.value) || (this.editMeter.heatCapacity != this.meterForm.controls.heatCapacity.value)) {
      await this.checkMeterData();
    }
    let meterToSave: IdbUtilityMeter = this.editMeterFormService.updateMeterFromForm(this.editMeter, this.meterForm);
    if (this.addOrEdit == 'edit') {
      this.utilityMeterDbService.update(meterToSave);
    } else if (this.addOrEdit == 'add') {
      delete meterToSave.id;
      this.utilityMeterDbService.add(meterToSave);
    }
    this.cancel();
  }

  cancel() {
    this.emitClose.emit(true);
  }

  meterFormChanges(form: FormGroup) {
    this.meterForm = form;
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
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let accountMeterData: Array<IdbUtilityMeterData> = await this.utilityMeterDataDbService.getAllByIndexRange("accountId", selectedFacility.accountId).toPromise();
      this.utilityMeterDataDbService.accountMeterData.next(accountMeterData);
      let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == selectedFacility.id });
      this.utilityMeterDataDbService.facilityMeterData.next(facilityMeterData);
      this.loadingService.setLoadingStatus(false);
      this.toastNoticationService.showToast("Meter and Meter Data Updated", undefined, undefined, false, "success");
    }
  }
}
