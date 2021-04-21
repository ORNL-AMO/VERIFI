import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
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
  meterFormDisabled: boolean;
  meterEnergyUnit: string;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService,
    private energyUnitsHelperService: EnergyUnitsHelperService, private editMeterFormService: EditMeterFormService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.meterEnergyUnit = this.editMeter.energyUnit;
    this.meterForm = this.editMeterFormService.getFormFromMeter(this.editMeter);
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(this.editMeter, false);
    if (meterData.length != 0) {
      this.meterFormDisabled = true;
      this.meterForm.controls.source.disable();
      this.meterForm.controls.startingUnit.disable();
      this.meterForm.controls.phase.disable();
      this.meterForm.controls.fuel.disable();
      this.meterForm.controls.heatCapacity.disable();
    }
  }

  saveChanges() {
    let meterToSave: IdbUtilityMeter = this.editMeterFormService.updateMeterFromForm(this.editMeter, this.meterForm);
    if (!this.meterEnergyUnit) {
      meterToSave.energyUnit = this.getMeterEnergyUnit();
    }
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

  getMeterEnergyUnit(): string {
    let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(this.meterForm.controls.startingUnit.value);
    if (isEnergyUnit) {
      return this.meterForm.controls.startingUnit.value;
    } else {
      let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(this.meterForm.controls.source.value);
      if (isEnergyMeter) {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        return selectedFacility.energyUnit;
      } else {
        return undefined;
      }
    }
  }
}
