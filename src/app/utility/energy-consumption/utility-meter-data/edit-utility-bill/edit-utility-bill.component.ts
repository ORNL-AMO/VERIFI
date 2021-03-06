import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { UtilityMeterDataService } from '../utility-meter-data.service';

@Component({
  selector: 'app-edit-utility-bill',
  templateUrl: './edit-utility-bill.component.html',
  styleUrls: ['./edit-utility-bill.component.css']
})
export class EditUtilityBillComponent implements OnInit {
  @Input()
  editMeterData: IdbUtilityMeterData;
  @Input()
  addOrEdit: string;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  meterDataForm: FormGroup;

  energyUnit: string;
  source: string;
  facilityMeter: IdbUtilityMeter;
  displayVolumeInput: boolean;
  displayEnergyUse: boolean;
  volumeUnit: string;
  invalidDate: boolean;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDataService: UtilityMeterDataService,
    private utilityMeterDbService: UtilityMeterdbService, private energyUnitsHelperService: EnergyUnitsHelperService) { }

  ngOnInit(): void {
  }

  ngOnChanges(){
    this.facilityMeter = this.utilityMeterDbService.getFacilityMeterById(this.editMeterData.meterId);
    this.displayVolumeInput = (this.energyUnitsHelperService.isEnergyUnit(this.facilityMeter.startingUnit) == false);
    this.source = this.facilityMeter.source;
    this.energyUnit = this.facilityMeter.energyUnit;
    this.volumeUnit = this.facilityMeter.startingUnit;
    this.displayEnergyUse = this.energyUnitsHelperService.isEnergyMeter(this.source);
    this.meterDataForm = this.utilityMeterDataService.getGeneralMeterDataForm(this.editMeterData, this.displayVolumeInput, this.displayEnergyUse);
    if (this.displayVolumeInput) {
      this.meterDataForm.controls.totalEnergyUse.disable();
    }
    this.checkDate();
  }

  cancel() {
    this.emitClose.emit(true);
  }

  saveAndQuit() {
    let meterDataToSave: IdbUtilityMeterData = this.utilityMeterDataService.updateGeneralMeterDataFromForm(this.editMeterData, this.meterDataForm);
    if (this.addOrEdit == 'edit') {
      this.utilityMeterDataDbService.update(meterDataToSave);
    } else {
      delete meterDataToSave.id;
      this.utilityMeterDataDbService.add(meterDataToSave);
    }
    this.cancel();
  }

  saveAndAddAnother() {
    let meterDataToSave: IdbUtilityMeterData = this.utilityMeterDataService.updateGeneralMeterDataFromForm(this.editMeterData, this.meterDataForm);
    delete meterDataToSave.id;
    this.utilityMeterDataDbService.add(meterDataToSave);
    this.editMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(this.facilityMeter);
    this.editMeterData.readDate = new Date(meterDataToSave.readDate);
    this.editMeterData.readDate.setMonth(this.editMeterData.readDate.getUTCMonth() + 1);
    this.meterDataForm = this.utilityMeterDataService.getGeneralMeterDataForm(this.editMeterData, this.displayVolumeInput, this.displayEnergyUse);
  }

  calculateTotalEnergyUse() {
    let totalEnergyUse: number = this.meterDataForm.controls.totalVolume.value * this.facilityMeter.heatCapacity;
    this.meterDataForm.controls.totalEnergyUse.patchValue(totalEnergyUse);
  }
  
  checkDate() {
    if (this.addOrEdit == 'add') {
      //new meter entry should have any year/month combo of existing meter reading
      this.invalidDate = this.utilityMeterDataDbService.checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.facilityMeter) != undefined;
    } else {
      //edit meter needs to allow year/month combo of the meter being edited
      let currentMeterItemDate: Date = new Date(this.editMeterData.readDate);
      let changeDate: Date = new Date(this.meterDataForm.controls.readDate.value);
      if (currentMeterItemDate.getUTCFullYear() == changeDate.getUTCFullYear() && currentMeterItemDate.getUTCMonth() && changeDate.getUTCMonth()) {
        this.invalidDate = false;
      } else {
        this.invalidDate = this.utilityMeterDataDbService.checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.facilityMeter) != undefined;
      }
    }
  }

}
