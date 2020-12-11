import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { ConvertUnitsService } from 'src/app/shared/convert-units/convert-units.service';
import { EnergyUnitOptions, SolidMassOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { GasOptions, LiquidOptions, SolidOptions, OtherEnergyOptions, FuelTypeOption } from './editMeterOptions';
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
  @Input()
  addOrEdit: string;

  meterForm: FormGroup;
  displayPhase: boolean;
  displayFuel: boolean;
  energyOptions: Array<FuelTypeOption>;
  startingUnitOptions: Array<UnitOption>;
  energySourceLabel: string = 'Fuel Type';
  constructor(private formBuilder: FormBuilder, private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService, private convertUnitsService: ConvertUnitsService) { }

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

    if (!this.meterForm.controls.source.value) {
      this.meterForm.controls.source.patchValue('Electricity');
      this.setSource();
    } else {
      this.setSourceValidation();
      this.setEnergyOptions();
    }
  }


  saveChanges() {
    if (this.addOrEdit == 'edit') {
      this.utilityMeterDbService.update(this.meterForm.value);
    } else if (this.addOrEdit == 'add') {
      let newMeter: IdbUtilityMeter = this.meterForm.value;
      delete newMeter.id;
      this.utilityMeterDbService.add(newMeter);
    }
    this.cancel();
  }

  cancel() {
    this.emitClose.emit(true);
  }

  setSource() {
    this.setSourceValidation();
    this.setEnergyOptions();
    this.setHeatCapacity();
  }

  setSourceValidation() {
    if (this.meterForm.controls.source.value == 'Other Fuels') {
      this.meterForm.controls.phase.setValidators([Validators.required]);
      if (!this.meterForm.controls.phase.value) {
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
      } else if (this.meterForm.controls.phase.value == 'Liquid') {
        this.energyOptions = LiquidOptions;
      } else if (this.meterForm.controls.phase.value == 'Gas') {
        this.energyOptions = GasOptions;
      }
    } else if (this.meterForm.controls.source.value == 'Water' || this.meterForm.controls.source.value == 'Waste Water') {
      this.energySourceLabel = 'Water Type'
      this.energyOptions = OtherEnergyOptions;
    } else if (this.meterForm.controls.source.value == 'Other Energy') {
      this.energySourceLabel = 'Energy Type'
      this.energyOptions = OtherEnergyOptions;
    }
    this.setUnitOptions();
  }

  //TODO: Set heat capacity and source for electricity and natural gas (no energy options used);
  setHeatCapacity() {
    if (this.meterForm.controls.source.value == 'Electricity') {
      let heatCapacity: number = this.convertUnitsService.value(.003412).from('kWh').to(this.meterForm.controls.startingUnit.value);
      this.meterForm.controls.heatCapacity.patchValue(heatCapacity);
      this.meterForm.controls.siteToSource.patchValue(3);
      //TODO: "On-site Renewable Electricity" has siteToSource = 1;
      //don't have any way to currently set "On-site"
    } else if (this.meterForm.controls.source.value == 'Natural Gas') {
      let heatCapacity: number = this.convertUnitsService.value(.001029).from('ft3').to(this.meterForm.controls.startingUnit.value);
      this.meterForm.controls.heatCapacity.patchValue(heatCapacity);
      this.meterForm.controls.siteToSource.patchValue(1);
    } else {
      let selectedEnergyOption: FuelTypeOption = this.energyOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
      if (selectedEnergyOption) {
        //copy for conversions
        let selectedEnergyOptionsCpy: FuelTypeOption = JSON.parse(JSON.stringify(selectedEnergyOption))
        //TODO: Add therms to unit converter
        if (selectedEnergyOption.startingUnit != 'Therms') {
          //TODO: Round value to some decimal place
          selectedEnergyOptionsCpy.heatCapacityValue = this.convertUnitsService.value(selectedEnergyOptionsCpy.heatCapacityValue).from(selectedEnergyOptionsCpy.startingUnit).to(this.meterForm.controls.startingUnit.value);
        }
        this.meterForm.controls.heatCapacity.patchValue(selectedEnergyOptionsCpy.heatCapacityValue);
        this.meterForm.controls.siteToSource.patchValue(selectedEnergyOptionsCpy.siteToSourceMultiplier);
      }
    }
  }

  setUnitOptions() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (this.meterForm.controls.source.value == 'Electricity') {
      this.meterForm.controls.startingUnit.patchValue(selectedFacility.energyUnit);
      this.startingUnitOptions = EnergyUnitOptions;
    } else if (this.meterForm.controls.source.value == 'Natural Gas') {
      this.meterForm.controls.startingUnit.patchValue(selectedFacility.volumeGasUnit);
      this.startingUnitOptions = VolumeGasOptions;
    } else if (this.meterForm.controls.source.value == 'Other Fuels') {
      if (this.meterForm.controls.phase.value == 'Gas') {
        this.meterForm.controls.startingUnit.patchValue(selectedFacility.volumeGasUnit);
        this.startingUnitOptions = VolumeGasOptions;
      } else if (this.meterForm.controls.phase.value == 'Liquid') {
        this.meterForm.controls.startingUnit.patchValue(selectedFacility.volumeLiquidUnit);
        this.startingUnitOptions = VolumeLiquidOptions;
      } else if (this.meterForm.controls.phase.value == 'Solid') {
        this.meterForm.controls.startingUnit.patchValue(selectedFacility.massSolidUnit);
        this.startingUnitOptions = SolidMassOptions;
      }
    } else if (this.meterForm.controls.source.value == 'Water' || this.meterForm.controls.source.value == 'Waste Water') {
      this.meterForm.controls.startingUnit.patchValue(selectedFacility.volumeLiquidUnit);
      this.startingUnitOptions = VolumeLiquidOptions;
    } else if (this.meterForm.controls.source.value == 'Other Energy') {
      let selectedEnergyOption: FuelTypeOption = JSON.parse(JSON.stringify(this.energyOptions.find(option => { return option.value == this.meterForm.controls.fuel.value })));
      if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        this.meterForm.controls.startingUnit.patchValue(selectedFacility.massSolidUnit);
        this.startingUnitOptions = SolidMassOptions;
      } else if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Chilled Water') {
        this.meterForm.controls.startingUnit.patchValue(selectedFacility.chilledWaterUnit);
        //TODO: Add chilled water units
      }
    }
  }
}
