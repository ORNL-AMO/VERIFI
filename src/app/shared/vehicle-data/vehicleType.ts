
import { MobileAircraftOptions } from 'src/app/shared/fuel-options/mobileAircraftOptions';
import { MobileBusOptions } from 'src/app/shared/fuel-options/mobileBusOptions';
import { MobileHeavyDutyTruckOptions } from 'src/app/shared/fuel-options/mobileHeavyDutyVehicleOptions';
import { MobileLightDutyTruckOptions } from 'src/app/shared/fuel-options/mobileLightDutyTruckOptions';
import { MobileMotorcycleOptions } from 'src/app/shared/fuel-options/mobileMotorcycleOptions';
import { MobileOffRoadAgricultureOptions } from 'src/app/shared/fuel-options/mobileOffRoadAgricultureOptions';
import { MobileOffRoadConstructionOptions } from 'src/app/shared/fuel-options/mobileOffRoadConstructionOptions';
import { MobilePassangerCarOptions } from 'src/app/shared/fuel-options/mobilePassangerCarOptions';
import { MobileRailOptions } from 'src/app/shared/fuel-options/mobileRailOptions';
import { MobileWaterTransportOptions } from 'src/app/shared/fuel-options/mobileWaterTransportOptions';
import { FuelTypeOption } from '../fuel-options/fuelTypeOption';

export type VehicleType = {
    value: number,
    label: string,
    category: number,
    fuelOptions: Array<FuelTypeOption>
  }
  
  export const VehicleTypes: Array<VehicleType> = [
    {
      value: 1,
      label: 'Passenger Cars',
      category: 2,
      fuelOptions: MobilePassangerCarOptions
    },
    {
      value: 2,
      label: "Light-Duty Trucks (Vans, Pickups, SUV's)",
      category: 2,
      fuelOptions: MobileLightDutyTruckOptions
    },
    {
      value: 3,
      label: "Bus",
      category: 2,
      fuelOptions: MobileBusOptions
    },
    {
      value: 4,
      label: "Heavy-Duty Vehicles",
      category: 2,
      fuelOptions: MobileHeavyDutyTruckOptions
    },
    {
      value: 5,
      label: "Motorcycles",
      category: 2,
      fuelOptions: MobileMotorcycleOptions
    },
    {
      value: 6,
      label: "Agricultural Equipment & Trucks",
      category: 3,
      fuelOptions: MobileOffRoadAgricultureOptions
    },
    {
      value: 7,
      label: "Construction/Mining Equipment & Trucks",
      category: 3,
      fuelOptions: MobileOffRoadConstructionOptions
    },
    {
      value: 8,
      label: "Aircraft",
      category: 4,
      fuelOptions: MobileAircraftOptions
    },
    {
      value: 9,
      label: "Rail",
      category: 4,
      fuelOptions: MobileRailOptions
    },
    {
      value: 10,
      label: 'Water Transport',
      category: 4,
      fuelOptions: MobileWaterTransportOptions
    }
];