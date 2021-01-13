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
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDataService: UtilityMeterDataService,
    private utilityMeterDbService: UtilityMeterdbService, private energyUnitsHelperService: EnergyUnitsHelperService) { }

  ngOnInit(): void {
    this.facilityMeter = this.utilityMeterDbService.getFacilityMeterById(this.editMeterData.meterId);
    if (this.facilityMeter) {
      this.energyUnit = this.facilityMeter.startingUnit
      this.source = this.facilityMeter.source;
    }
    this.displayVolumeInput = (this.energyUnitsHelperService.isEnergyUnit(this.energyUnit) == false);
    this.meterDataForm = this.utilityMeterDataService.getGeneralMeterDataForm(this.editMeterData);
  }

  cancel() {
    this.emitClose.emit(true);
  }

  meterDataSave() {
    if (this.addOrEdit == 'edit') {
      this.utilityMeterDataDbService.update(this.meterDataForm.value);
    } else {
      let meterData: IdbUtilityMeterData = this.meterDataForm.value;
      delete meterData.id;
      this.utilityMeterDataDbService.add(this.meterDataForm.value);
    }
    this.cancel();
  }


  calculateTotalEnergyUse() {
    let totalEnergyUse: number = this.meterDataForm.controls.totalVolume.value * this.facilityMeter.heatCapacity;
    this.meterDataForm.controls.totalEnergyUse.patchValue(totalEnergyUse);
  }
}
