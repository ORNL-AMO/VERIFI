import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { FuelTypeOption, OtherEnergyOptions } from '../../energy-source/edit-meter-form/editMeterOptions';
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
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDataService: UtilityMeterDataService, private utilityMeterDbService: UtilityMeterdbService,
    private energyUnitsHelperService: EnergyUnitsHelperService) { }

  ngOnInit(): void {
    this.energyUnit = this.energyUnitsHelperService.getEnergyUnit(this.editMeterData.meterId);
    let facilityMeter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(this.editMeterData.meterId);
    if (facilityMeter) {
      this.source = facilityMeter.source;
    }
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
}
