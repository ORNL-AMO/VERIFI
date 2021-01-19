import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { EnergyUseCalculationsService } from 'src/app/shared/helper-services/energy-use-calculations.service';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { EditMeterFormService } from './edit-meter-form.service';
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
  facilityEnergyUnit: string;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService,
    private energyUnitsHelperService: EnergyUnitsHelperService, private energyUseCalculationsService: EnergyUseCalculationsService, private editMeterFormService: EditMeterFormService) { }

  ngOnInit(): void {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (selectedFacility) {
      this.facilityEnergyUnit = selectedFacility.energyUnit;
    }
    this.meterForm = this.editMeterFormService.getFormFromMeter(this.editMeter);
    this.setFuelTypeOptions();
    this.checkDisplayFuel();
    this.checkDisplayPhase();
    this.setStartingUnitOptions();
    this.checkShowHeatCapacity();
  }

  saveChanges() {
    let meterToSave: IdbUtilityMeter = this.editMeterFormService.updateMeterFromForm(this.editMeter, this.meterForm);
    meterToSave.energyUnit = this.getMeterEnergyUnit();
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

  changeSource() {
    this.setFuelTypeOptions();
    this.checkDisplayFuel();
    this.checkDisplayPhase();
    this.updatePhaseAndFuelValidation();
    this.setStartingUnitOptions();
    this.checkShowHeatCapacity();
    this.setHeatCapacityAndSiteToSource();
  }

  changeFuel() {
    if (this.meterForm.controls.source.value == 'Other Energy') {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      this.setOtherEnergyUnitOptions(selectedFacility);
    }
    this.checkShowHeatCapacity();
    this.setHeatCapacityAndSiteToSource();
  }

  changePhase() {
    this.setStartingUnitOptions();
    this.setFuelTypeOptions();
    this.checkShowHeatCapacity();
    this.setHeatCapacityAndSiteToSource();
  }

  changeUnit() {
    this.checkShowHeatCapacity();
    this.setHeatCapacityAndSiteToSource();

  }

  setEnergySourceLabel() {
    if (this.meterForm.controls.source.value == 'Other Fuels') {
      this.energySourceLabel = 'Fuel Type';
    } else if (this.meterForm.controls.source.value == 'Other Energy') {
      this.energySourceLabel = 'Energy Type'
    }
  }

  checkDisplayPhase() {
    if (this.meterForm.controls.source.value == 'Other Fuels') {
      this.displayPhase = true;
    } else {
      this.displayPhase = false;
    }
  }

  checkDisplayFuel() {
    if (this.meterForm.controls.source.value == 'Other Fuels' || this.meterForm.controls.source.value == 'Other Energy') {
      this.displayFuel = true;
    } else {
      this.displayFuel = false;
    }
  }

  updatePhaseAndFuelValidation() {
    let fuelValidators: Array<ValidatorFn> = this.editMeterFormService.getFuelValidation(this.meterForm.controls.source.value);
    this.meterForm.controls.fuel.setValidators(fuelValidators);
    this.meterForm.controls.fuel.updateValueAndValidity();

    let phaseValidators: Array<ValidatorFn> = this.editMeterFormService.getPhaseValidation(this.meterForm.controls.source.value);
    this.meterForm.controls.phase.setValidators(phaseValidators);
    this.meterForm.controls.phase.updateValueAndValidity();
  }

  setFuelTypeOptions() {
    this.fuelTypeOptions = this.energyUseCalculationsService.getFuelTypeOptions(this.meterForm.controls.source.value, this.meterForm.controls.phase.value);
    let selectedEnergyOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
    if (!selectedEnergyOption && this.fuelTypeOptions.length != 0) {
      this.meterForm.controls.fuel.patchValue(this.fuelTypeOptions[0].value);
    }
  }

  //TODO: Set heat capacity and source for electricity and natural gas (no energy options used);
  setHeatCapacityAndSiteToSource() {
    if (this.displayHeatCapacity) {
      let selectedEnergyOption: FuelTypeOption = this.fuelTypeOptions.find(option => { return option.value == this.meterForm.controls.fuel.value });
      let heatCapacityAndSiteToSource: { heatCapacity: number, siteToSource: number } = this.energyUseCalculationsService.getHeatingCapacityAndSiteToSourceValue(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value, selectedEnergyOption)
      this.meterForm.controls.heatCapacity.patchValue(heatCapacityAndSiteToSource.heatCapacity);
      this.meterForm.controls.siteToSource.patchValue(heatCapacityAndSiteToSource.siteToSource);
    }
  }

  checkShowHeatCapacity() {
    this.displayHeatCapacity = this.editMeterFormService.checkShowHeatCapacity(this.meterForm.controls.source.value, this.meterForm.controls.startingUnit.value);
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

  setStartingUnitOptions() {
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
}
