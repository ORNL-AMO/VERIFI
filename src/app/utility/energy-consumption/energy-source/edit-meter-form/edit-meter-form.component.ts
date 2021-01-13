import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { EnergyUseCalculationsService } from 'src/app/shared/helper-services/energy-use-calculations.service';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { FuelTypeOption } from './editMeterOptions';
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
  fuelTypeOptions: Array<FuelTypeOption>;
  startingUnitOptions: Array<UnitOption>;
  energySourceLabel: string = 'Fuel Type';
  displayHeatCapacity: boolean;
  constructor(private formBuilder: FormBuilder, private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService,
    private energyUnitsHelperService: EnergyUnitsHelperService, private energyUseCalculationsService: EnergyUseCalculationsService) { }

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

    if (this.meterForm.controls.source.value == 'Other Fuels' || this.meterForm.controls.source.value == 'Other Energy') {
      this.displayFuel = true;
      this.meterForm.controls.fuel.setValidators([Validators.required]);
    } else {
      this.displayFuel = false;
      this.meterForm.controls.fuel.setValidators([]);
    }
    this.meterForm.controls.phase.updateValueAndValidity();
    this.meterForm.controls.fuel.updateValueAndValidity();
  }

  setEnergyOptions() {
    this.fuelTypeOptions = this.energyUseCalculationsService.getFuelTypeOptions(this.meterForm.controls.source.value, this.meterForm.controls.phase.value);
    let selectedEnergyOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
    if (!selectedEnergyOption && this.fuelTypeOptions.length != 0) {
      this.meterForm.controls.fuel.patchValue(this.fuelTypeOptions[0].value);
    }
    if (this.meterForm.controls.source.value == 'Other Fuels') {
      this.energySourceLabel = 'Fuel Type';
    } else if (this.meterForm.controls.source.value == 'Other Energy') {
      this.energySourceLabel = 'Energy Type'
    }
    this.setUnitOptions();
  }

  changeFuelType() {
    if (this.meterForm.controls.source.value == 'Other Energy') {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      this.setOtherEnergyUnitOptions(selectedFacility);
    }
    this.checkShowHeatCapacity();
  }

  //TODO: Set heat capacity and source for electricity and natural gas (no energy options used);
  setHeatCapacity() {
    let selectedEnergyOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
    let heatCapacityAndSiteToSource: { heatCapacity: number, siteToSource: number } = this.energyUseCalculationsService.getHeatingCapacityAndSiteToSourceValue(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value, selectedEnergyOption)
    this.meterForm.controls.heatCapacity.patchValue(heatCapacityAndSiteToSource.heatCapacity);
    this.meterForm.controls.siteToSource.patchValue(heatCapacityAndSiteToSource.siteToSource);
  }

  setUnitOptions() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (this.meterForm.controls.source.value == 'Electricity') {
      this.meterForm.controls.startingUnit.patchValue(selectedFacility.energyUnit);
      this.startingUnitOptions = EnergyUnitOptions;
    } else if (this.meterForm.controls.source.value == 'Natural Gas') {
      this.meterForm.controls.startingUnit.patchValue(selectedFacility.volumeGasUnit);
      this.startingUnitOptions = VolumeGasOptions.concat(EnergyUnitOptions);
    } else if (this.meterForm.controls.source.value == 'Other Fuels') {
      if (this.meterForm.controls.phase.value == 'Gas') {
        this.meterForm.controls.startingUnit.patchValue(selectedFacility.volumeGasUnit);
        this.startingUnitOptions = VolumeGasOptions.concat(EnergyUnitOptions);
      } else if (this.meterForm.controls.phase.value == 'Liquid') {
        this.meterForm.controls.startingUnit.patchValue(selectedFacility.volumeLiquidUnit);
        this.startingUnitOptions = VolumeLiquidOptions.concat(EnergyUnitOptions);
      } else if (this.meterForm.controls.phase.value == 'Solid') {
        this.meterForm.controls.startingUnit.patchValue(selectedFacility.massUnit);
        this.startingUnitOptions = MassUnitOptions.concat(EnergyUnitOptions);
      }
    } else if (this.meterForm.controls.source.value == 'Other Energy') {
      this.setOtherEnergyUnitOptions(selectedFacility);
    } else if (this.meterForm.controls.source.value == 'Water' || this.meterForm.controls.source.value == 'Waste Water') {
      this.startingUnitOptions = VolumeLiquidOptions;
      this.meterForm.controls.startingUnit.patchValue(selectedFacility.volumeLiquidUnit);
    }
    this.checkShowHeatCapacity();
  }

  setOtherEnergyUnitOptions(selectedFacility: IdbFacility) {
    let selectedEnergyOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
    if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
      this.meterForm.controls.startingUnit.patchValue(selectedFacility.massUnit);
      this.startingUnitOptions = MassUnitOptions.concat(EnergyUnitOptions);
    } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Chilled Water') {
      this.meterForm.controls.startingUnit.patchValue(selectedFacility.chilledWaterUnit);
      //TODO: Add chilled water units
    } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Hot Water') {
      this.meterForm.controls.startingUnit.patchValue(selectedFacility.energyUnit);
      this.startingUnitOptions = EnergyUnitOptions;
    }
  }


  checkShowHeatCapacity() {
    if (this.meterForm.controls.source.value != 'Waste Water' && this.meterForm.controls.source.value != 'Water' && this.meterForm.controls.source.value != 'Other Utility') {
      this.displayHeatCapacity = (this.energyUnitsHelperService.isEnergyUnit(this.meterForm.controls.startingUnit.value) == false);
      if (this.displayHeatCapacity) {
        this.setHeatCapacity();
      }
    } else {
      this.displayHeatCapacity = false;
    }
  }

  changePhase() {
    this.setEnergyOptions();
    this.setHeatCapacity();
  }
}
