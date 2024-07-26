import { Component, Input } from '@angular/core';
import { FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { EnergyUnitOptions, UnitOption, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { VehicleCategories, VehicleCategory, VehicleCollectionType, VehicleCollectionTypes } from 'src/app/shared/vehicle-data/vehicleCategory';
import { VehicleType, VehicleTypes } from 'src/app/shared/vehicle-data/vehicleType';
import { EditMeterFormService } from '../edit-meter-form.service';
import { IdbCustomFuel } from 'src/app/models/idb';
import { getMobileFuelTypes } from 'src/app/shared/fuel-options/getFuelTypeOptions';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { getHeatingCapacity } from 'src/app/shared/sharedHelperFuntions';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-vehicle-form',
  templateUrl: './vehicle-form.component.html',
  styleUrls: ['./vehicle-form.component.css']
})
export class VehicleFormComponent {
  @Input()
  meterForm: FormGroup;
  @Input()
  facility: IdbFacility;

  vehicleCategories: Array<VehicleCategory> = VehicleCategories;
  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  vehicleTypes: Array<VehicleType> = [];
  vehicleCollectionTypes: Array<VehicleCollectionType> = VehicleCollectionTypes;
  collectionUnitOptions: Array<UnitOption> = [];
  fuelOptions: Array<FuelTypeOption> = [];
  hasDifferentEnergyUnits: boolean = false;
  selectedFuelTypeOption: FuelTypeOption;
  constructor(private editMeterFormService: EditMeterFormService, private customFuelDbService: CustomFuelDbService) {
  }

  ngOnInit() {
    if (this.meterForm.controls.vehicleCategory.value == undefined) {
      this.meterForm.controls.vehicleCategory.patchValue(1);
      this.meterForm.controls.vehicleCategory.updateValueAndValidity();
      this.updateVehicleValidation();
    };
    if (this.meterForm.controls.vehicleCollectionType.value == undefined) {
      this.meterForm.controls.vehicleCollectionType.patchValue(1);
      this.meterForm.controls.vehicleCollectionType.updateValueAndValidity();
    }
    if (this.meterForm.controls.vehicleDistanceUnit.value == undefined) {
      this.meterForm.controls.vehicleDistanceUnit.patchValue('mi');
      this.meterForm.controls.vehicleDistanceUnit.updateValueAndValidity();
    }
    this.setVehicleTypes();
    this.setCollectionUnitOptions();
    this.setFuelOptions();
    this.setHasDifferentEnergyUnits();
  }

  changeVehicleCategory() {
    this.setVehicleTypes();
    this.updateVehicleValidation();
  }

  setVehicleTypes() {
    this.vehicleTypes = VehicleTypes.filter(vType => {
      return vType.category == this.meterForm.controls.vehicleCategory.value;
    });
    if (this.vehicleTypes.length != 0) {
      if (this.vehicleTypes.find(vType => { return vType.value == this.meterForm.controls.vehicleType.value }) == undefined) {
        this.meterForm.controls.vehicleType.patchValue(this.vehicleTypes[0].value);
      }
      this.meterForm.controls.vehicleType.setValidators([Validators.required]);
    } else {
      this.meterForm.controls.vehicleType.patchValue(undefined);
      this.meterForm.controls.vehicleType.setValidators([]);
    }

    if (this.meterForm.controls.vehicleCategory.value != 2 && this.meterForm.controls.vehicleCollectionType.value == 2) {
      this.meterForm.controls.vehicleCollectionType.patchValue(1);
      this.setCollectionUnitOptions();
    }
    this.setFuelOptions();
  }

  setCollectionUnitOptions() {
    this.collectionUnitOptions = VolumeLiquidOptions;
    let checkExists: UnitOption = this.collectionUnitOptions.find(option => {
      return option.value == this.meterForm.controls.vehicleCollectionUnit.value;
    });
    if (!checkExists) {
      this.meterForm.controls.vehicleCollectionUnit.patchValue('gal');
    }
  }

  setFuelOptions() {
    let allFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
    this.fuelOptions = getMobileFuelTypes(this.meterForm.controls.vehicleCategory.value, this.meterForm.controls.vehicleType.value, allFuels)
    let checkExists: FuelTypeOption = this.fuelOptions.find(option => {
      return option.value == this.meterForm.controls.vehicleFuel.value;
    });
    if (!checkExists) {
      this.meterForm.controls.vehicleFuel.patchValue(this.fuelOptions[0].value);
    }
    this.setSelectedFuelType();
  }

  setSelectedFuelType() {
    this.selectedFuelTypeOption = this.fuelOptions.find(option => {
      return option.value == this.meterForm.controls.vehicleFuel.value;
    });
    this.setHeatCapacity();
  }

  setHeatCapacity(){
    let heatCapacity: number = getHeatingCapacity(this.meterForm.controls.source.value, this.meterForm.controls.vehicleCollectionUnit.value, this.meterForm.controls.energyUnit.value, this.selectedFuelTypeOption);
    this.meterForm.controls.heatCapacity.patchValue(heatCapacity);
  }

  updateVehicleValidation() {
    let additionalVehicleValidation: Array<ValidatorFn> = this.editMeterFormService.getAdditionalVehicleValidation(this.meterForm.controls.scope.value, this.meterForm.controls.vehicleCategory.value);

    this.meterForm.controls.vehicleType.setValidators(additionalVehicleValidation);
    this.meterForm.controls.vehicleType.updateValueAndValidity();

    this.meterForm.controls.vehicleCollectionType.setValidators(additionalVehicleValidation);
    this.meterForm.controls.vehicleCollectionType.updateValueAndValidity();

    this.meterForm.controls.vehicleFuelEfficiency.setValidators(additionalVehicleValidation);
    this.meterForm.controls.vehicleFuelEfficiency.updateValueAndValidity();

    this.meterForm.controls.vehicleDistanceUnit.setValidators(additionalVehicleValidation);
    this.meterForm.controls.vehicleDistanceUnit.updateValueAndValidity();
  }

  changeEnergyUnit(){
    this.setHasDifferentEnergyUnits();
    this.setHeatCapacity();
  }

  setHasDifferentEnergyUnits() {
    this.hasDifferentEnergyUnits = this.facility.energyUnit != this.meterForm.controls.energyUnit.value;
  }
}
