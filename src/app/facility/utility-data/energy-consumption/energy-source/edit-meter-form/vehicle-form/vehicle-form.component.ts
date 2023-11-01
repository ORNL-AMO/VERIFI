import { Component, Input } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';
import { UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';

@Component({
  selector: 'app-vehicle-form',
  templateUrl: './vehicle-form.component.html',
  styleUrls: ['./vehicle-form.component.css']
})
export class VehicleFormComponent {
  @Input()
  meterForm: FormGroup;

  vehicleCategories: Array<VehicleCategory> = VehicleCategories;
  vehicleTypes: Array<VehicleType> = [];
  vehicleCollectionTypes: Array<{ value: number, label: string }> = [{ value: 1, label: 'Fuel Usage' }, { value: 2, label: 'Mileage' }];
  collectionUnitOptions: Array<UnitOption> = [];
  fuelOptions: Array<string> = [];
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
    //fuel usage
    if (this.meterForm.controls.vehicleCollectionType.value == 1) {
      this.collectionUnitOptions = VolumeGasOptions.concat(VolumeLiquidOptions);
    } else {
      //Mileage
      this.collectionUnitOptions = [{
        display: 'Miles',
        value: 'mi',
        unitsOfMeasure: 'Imperial'
      }, {
        display: 'Kilometers',
        value: 'km',
        unitsOfMeasure: 'Metric'
      }];
    }
    let checkExists: UnitOption = this.collectionUnitOptions.find(option => {
      return option.value == this.meterForm.controls.vehicleCollectionUnit.value;
    });
    if (!checkExists) {
      this.meterForm.controls.vehicleCollectionUnit.patchValue(this.collectionUnitOptions[0].value);
    }
  }

  setFuelOptions() {
    if (this.meterForm.controls.vehicleCategory.value == 1) {
      this.fuelOptions = MaterialTransportOnsiteFuels;
    } else {
      let vehicleType: VehicleType = VehicleTypes.find(vType => {
        return vType.value == this.meterForm.controls.vehicleType.value;
      });
      if (vehicleType) {
        this.fuelOptions = vehicleType.fuelOptions;
      }
    }

    let checkExists: string = this.fuelOptions.find(option => {
      return option == this.meterForm.controls.vehicleFuel.value;
    });
    if (!checkExists) {
      this.meterForm.controls.vehicleFuel.patchValue(this.fuelOptions[0]);
    }

  }

  changeCollectionUnit() {

  }
}

export type VehicleCategory = {
  value: number, label: string
}

export const VehicleCategories: Array<VehicleCategory> = [
  {
    value: 1,
    label: 'Material Transport Onsite'
  },
  {
    value: 2,
    label: 'On-Road Vehicle'
  },
  {
    value: 3,
    label: 'Off-Road Vehicles'
  },
  {
    value: 4,
    label: 'Non-Road Vehicles'
  }
];

export type VehicleType = {
  value: number,
  label: string,
  category: number,
  fuelOptions: Array<string>
}

export const MaterialTransportOnsiteFuels: Array<string> = ['Propane', 'Diesel', 'Gasoline'];
export const PassengerCarFuels: Array<string> = ['Gasoline', 'Diesel', 'Ethanol', 'Compressed Natural Gas (CNG)', 'Liquified Petroleum Gas (LPG)', 'Biodiesel']
export const OffRoadVehicleFuels: Array<string> = ['Gasoline (2-stroke)', 'Gasoline (4-stroke)', 'Diesel', 'Liquified Petroleum Gas (LPG)']
export const VehicleTypes: Array<VehicleType> = [
  {
    value: 1,
    label: 'Passenger Cars',
    category: 2,
    fuelOptions: PassengerCarFuels
  },
  {
    value: 2,
    label: "Light-Duty Trucks (Vans, Pickups, SUV's)",
    category: 2,
    fuelOptions: PassengerCarFuels
  },
  {
    value: 3,
    label: "Bus",
    category: 2,
    fuelOptions: PassengerCarFuels
  },
  {
    value: 4,
    label: "Heavy-Duty Vehicles",
    category: 2,
    fuelOptions: PassengerCarFuels
  },
  {
    value: 5,
    label: "Motorcycles",
    category: 2,
    fuelOptions: ['Gasoline']
  },
  {
    value: 6,
    label: "Agricultural Equuipment & Trucks",
    category: 3,
    fuelOptions: OffRoadVehicleFuels
  },
  {
    value: 7,
    label: "Construction/Mining Equipment & Trucks",
    category: 3,
    fuelOptions: OffRoadVehicleFuels
  },
  {
    value: 8,
    label: "Aircraft",
    category: 4,
    fuelOptions: ['Jet Fuel', 'Aviation Gasoline']
  },
  {
    value: 9,
    label: "Rail",
    category: 4,
    fuelOptions: ['Diesel']
  },
  {
    value: 10,
    label: 'Water Transport',
    category: 4,
    fuelOptions: ['Residual Fuel Oil', 'Gasoline', 'Diesel']
  }
]
