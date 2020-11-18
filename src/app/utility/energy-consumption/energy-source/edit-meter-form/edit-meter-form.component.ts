import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db-service';
import { IdbUtilityMeter } from 'src/app/models/idb';

@Component({
  selector: 'app-edit-meter-form',
  templateUrl: './edit-meter-form.component.html',
  styleUrls: ['./edit-meter-form.component.css']
})
export class EditMeterFormComponent implements OnInit {
  @Input()
  editMeter: IdbUtilityMeter;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  meterForm: FormGroup;
  displayPhaseAndFuel: boolean;
  constructor(private formBuilder: FormBuilder, private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.meterForm = this.formBuilder.group({
      id: [this.editMeter.id],
      facilityId: [this.editMeter.facilityId],
      accountId: [this.editMeter.accountId],
      groupId: [this.editMeter.groupId],
      meterNumber: [this.editMeter.meterNumber],
      accountNumber: [this.editMeter.accountNumber],
      type: [this.editMeter.type],
      phase: [this.editMeter.phase],
      unit: [this.editMeter.unit, Validators.required],
      heatCapacity: [this.editMeter.heatCapacity, Validators.required],
      siteToSource: [this.editMeter.siteToSource, Validators.required],
      name: [this.editMeter.name, Validators.required],
      location: [this.editMeter.location],
      supplier: [this.editMeter.supplier, Validators.required],
      notes: [this.editMeter.notes],
      source: [this.editMeter.source, Validators.required],
      group: [this.editMeter.group],
      fuel: [this.editMeter.fuel, Validators.required],
      startingUnit: [this.editMeter.startingUnit, Validators.required]
    });
  }


  saveChanges() {
    //TODO: Decide if we want to add unsorted group here of in group page for all meters without group
    // If group is not defined, get "Unsorted" group's id/
    // The Unsorted group can be altered/deleted by the user so the id can change.
    if (this.meterForm.value.group == '') {
      //this.meterForm.value.group = await this.groupCheckExistence("Energy", "Unsorted");
    }
    //don't think group type is used
    // this.meterForm.controls['groupType'].setValue("Energy");

    //TODO: idk about energyFinalUnit
    // this.meterForm.controls['finalUnit'].setValue(this.energyFinalUnit);

    this.utilityMeterDbService.update(this.meterForm.value);
    this.cancel();
  }

  cancel() {
    this.emitClose.emit(true);
  }

  setSourceValidation() {
    if (this.meterForm.controls.source.value == 'Electricity' || this.meterForm.controls.source.value == 'Natural Gas') {
      this.displayPhaseAndFuel = false;
      this.meterForm.controls.phase.setValidators([]);
      this.meterForm.controls.fuel.setValidators([]);
    } else {
      this.displayPhaseAndFuel = true;
      this.meterForm.controls.phase.setValidators([Validators.required]);
      this.meterForm.controls.fuel.setValidators([Validators.required]);
    }
    this.meterForm.controls.phase.updateValueAndValidity();
    this.meterForm.controls.fuel.updateValueAndValidity();
  }
}
