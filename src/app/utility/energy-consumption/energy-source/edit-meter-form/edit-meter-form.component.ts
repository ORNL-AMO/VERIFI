import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { GasOptions, LiquidOptions, SolidOptions, OtherEnergyOptions, GasUnits, LiquidUnits, SolidUnits, ElectricityUnits, FuelTypeOption } from './editMeterOptions';
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
  displayPhase: boolean;
  displayFuel: boolean;
  energyOptions: Array<FuelTypeOption>;
  startingUnitOptions: Array<string>;
  energySourceLabel: string = 'Fuel Type';
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
    this.changeSource();
  }


  saveChanges() {
    this.utilityMeterDbService.update(this.meterForm.value);
    this.cancel();
  }

  cancel() {
    this.emitClose.emit(true);
  }

  changeSource() {
    this.setSourceValidation();
    this.setEnergyOptions();
  }

  setSourceValidation() {
    if (this.meterForm.controls.source.value == 'Other Fuels') {
      this.meterForm.controls.phase.setValidators([Validators.required]);
      if(!this.meterForm.controls.phase.value){
        this.meterForm.controls.phase.patchValue('Gas');
      }
      this.displayPhase = true;
    } else {
      this.displayPhase = false;
      this.meterForm.controls.phase.setValidators([]);

    }

    if (this.meterForm.controls.source.value == 'Electricity' || this.meterForm.controls.source.value == 'Natural Gas' || this.meterForm.controls.source.value == 'Other Utility') {
      this.displayFuel = false;
      this.meterForm.controls.fuel.setValidators([]);
    } else {
      this.displayFuel = true;
      this.meterForm.controls.fuel.setValidators([Validators.required]);
    }
    this.meterForm.controls.phase.updateValueAndValidity();
    this.meterForm.controls.fuel.updateValueAndValidity();
  }

  setEnergyOptions() {
    if (this.meterForm.controls.source.value == 'Other Fuels') {
      this.energySourceLabel = 'Fuel Type';
      if (this.meterForm.controls.phase.value == 'Solid') {
        this.energyOptions = SolidOptions;
        this.startingUnitOptions = SolidUnits;
      } else if (this.meterForm.controls.phase.value == 'Liquid') {
        this.energyOptions = LiquidOptions;
        this.startingUnitOptions = LiquidUnits;
      } else if (this.meterForm.controls.phase.value == 'Gas') {
        this.energyOptions = GasOptions;
        this.startingUnitOptions = GasUnits;
      }
    } else if (this.meterForm.controls.source.value == 'Water' || this.meterForm.controls.source.value == 'Waste Water') {
      this.energySourceLabel = 'Water Type'
      this.energyOptions = OtherEnergyOptions;
    } else if (this.meterForm.controls.source.value == 'Other Energy') {
      this.energySourceLabel = 'Energy Type'
      this.energyOptions = OtherEnergyOptions;
    } else if (this.meterForm.controls.source.value == 'Electricity') {
      this.startingUnitOptions = ElectricityUnits;
    }
  }

  setFuelType() {
    let selectedEnergyOption: FuelTypeOption = this.energyOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
    this.meterForm.controls.heatCapacity.patchValue(selectedEnergyOption.conversionToMMtbu);
    this.meterForm.controls.siteToSource.patchValue(selectedEnergyOption.siteToSourceMultiplier);
  }
}
