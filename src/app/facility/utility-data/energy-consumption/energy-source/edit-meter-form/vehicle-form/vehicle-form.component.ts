import { Component, Input } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { MobileTransportOnsiteOptions } from 'src/app/shared/fuel-options/mobileTransportOnsiteOptions';
import { EnergyUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { VehicleCategories, VehicleCategory } from 'src/app/shared/vehicle-data/vehicleCategory';
import { VehicleType, VehicleTypes } from 'src/app/shared/vehicle-data/vehicleType';

@Component({
  selector: 'app-vehicle-form',
  templateUrl: './vehicle-form.component.html',
  styleUrls: ['./vehicle-form.component.css']
})
export class VehicleFormComponent {
  @Input()
  meterForm: FormGroup;

  vehicleCategories: Array<VehicleCategory> = VehicleCategories;
  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  vehicleTypes: Array<VehicleType> = [];
  vehicleCollectionTypes: Array<{ value: number, label: string }> = [{ value: 1, label: 'Fuel Usage' }, { value: 2, label: 'Mileage' }];
  collectionUnitOptions: Array<UnitOption> = [];
  fuelOptions: Array<FuelTypeOption> = [];
  //TODO: set
  hasDifferentEnergyUnits: boolean = false;
  selectedFuelTypeOption: FuelTypeOption;
  constructor() {
  }

  ngOnInit() {
    if (this.meterForm.controls.vehicleCategory.value == undefined) {
      this.meterForm.controls.vehicleCategory.patchValue(1);
      this.meterForm.controls.vehicleCategory.updateValueAndValidity();
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
  }

  setFormValidation() {

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

    if (this.meterForm.controls.vehicleType.value != 2 && this.meterForm.controls.vehicleCollectionType.value == 2) {
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
    if (this.meterForm.controls.vehicleCategory.value == 1) {
      this.fuelOptions = MobileTransportOnsiteOptions;
    } else {
      let vehicleType: VehicleType = VehicleTypes.find(vType => {
        return vType.value == this.meterForm.controls.vehicleType.value;
      });
      if (vehicleType) {
        this.fuelOptions = vehicleType.fuelOptions;
      }
    }

    let checkExists: FuelTypeOption = this.fuelOptions.find(option => {
      return option == this.meterForm.controls.vehicleFuel.value;
    });
    if (!checkExists) {
      this.meterForm.controls.vehicleFuel.patchValue(this.fuelOptions[0].value);
    }
    this.setSelectedFuelType();
  }

  changeCollectionUnit() {

  }

  changeEnergyUnit() {

  }

  setSelectedFuelType() {
    this.selectedFuelTypeOption = this.fuelOptions.find(option => {
      return option.value == this.meterForm.controls.vehicleFuel.value;
    });
  }
}
