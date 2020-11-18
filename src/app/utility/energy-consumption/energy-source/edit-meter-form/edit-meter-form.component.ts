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
  constructor(private formBuilder: FormBuilder, private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.meterForm = this.formBuilder.group({
      id: [this.editMeter.id, Validators.required],
      facilityId: [this.editMeter.facilityId, Validators.required],
      accountId: [this.editMeter.accountId, Validators.required],
      groupId: [this.editMeter.groupId, Validators.required],
      meterNumber: [this.editMeter.meterNumber, Validators.required],
      accountNumber: [this.editMeter.accountNumber, Validators.required],
      type: [this.editMeter.type, Validators.required],
      phase: [this.editMeter.phase, Validators.required],
      unit: [this.editMeter.unit, Validators.required],
      heatCapacity: [this.editMeter.heatCapacity, Validators.required],
      siteToSource: [this.editMeter.siteToSource, Validators.required],
      name: [this.editMeter.name, Validators.required],
      location: [this.editMeter.location, Validators.required],
      supplier: [this.editMeter.supplier, Validators.required],
      notes: [this.editMeter.notes, Validators.required],
      source: [this.editMeter.source, Validators.required],
      group: [this.editMeter.group, Validators.required],
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
}
