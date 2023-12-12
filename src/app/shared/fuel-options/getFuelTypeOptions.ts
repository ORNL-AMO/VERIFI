import { MeterPhase, MeterSource } from "src/app/models/constantsAndTypes";
import { IdbCustomFuel, IdbUtilityMeter } from "src/app/models/idb";
import { FuelTypeOption } from "./fuelTypeOption";
import { StationarySolidOptions } from "./stationarySolidOptions";
import { StationaryLiquidOptions } from "./stationaryLiquidOptions";
import { StationaryGasOptions } from "./stationaryGasOptions";
import { StationaryOtherEnergyOptions } from "./stationaryOtherEnergyOptions";
import { MobileBusOptions } from "./mobileBusOptions";
import { MobileHeavyDutyTruckOptions } from "./mobileHeavyDutyVehicleOptions";
import { MobileLightDutyTruckOptions } from "./mobileLightDutyTruckOptions";
import { MobileMotorcycleOptions } from "./mobileMotorcycleOptions";
import { MobileOffRoadAgricultureOptions } from "./mobileOffRoadAgricultureOptions";
import { MobileOffRoadConstructionOptions } from "./mobileOffRoadConstructionOptions";
import { MobilePassangerCarOptions } from "./mobilePassangerCarOptions";
import { MobileRailOptions } from "./mobileRailOptions";
import { MobileTransportOnsiteOptions } from "./mobileTransportOnsiteOptions";
import { MobileWaterTransportOptions } from "./mobileWaterTransportOptions";
import { VehicleType, VehicleTypes } from "../vehicle-data/vehicleType";



export function getFuelTypeOptions(source: MeterSource, phase: MeterPhase, customFuels: Array<IdbCustomFuel>, scope: number): Array<FuelTypeOption> {
    if (source == 'Other Fuels') {
        if (scope == 1) {
            //scope 1 stationary
            let sourceCustomFuels: Array<IdbCustomFuel> = customFuels.filter(cFuel => {
                return cFuel.phase == phase
            });
            let fuels: Array<FuelTypeOption> = sourceCustomFuels.map(option => {
                return option
            });
            if (phase == 'Solid') {
                StationarySolidOptions.forEach(option => {
                    fuels.push(option);
                });
                return fuels;
            } else if (phase == 'Liquid') {
                StationaryLiquidOptions.forEach(option => {
                    fuels.push(option);
                });
                return fuels;
            } else if (phase == 'Gas') {
                StationaryGasOptions.forEach(option => {
                    fuels.push(option);
                });
                return fuels;
            }
        } else if (scope == 2) {
            //scope 1 mobile
            return getAllMobileFuelTypes();
        }
    } else if (source == 'Other Energy') {
        return StationaryOtherEnergyOptions;
    }
    return [];
}

export function getAllMobileFuelTypes(): Array<FuelTypeOption> {
    return [].concat(MobileHeavyDutyTruckOptions,
        MobileBusOptions,
        MobileLightDutyTruckOptions,
        MobileMotorcycleOptions,
        MobileOffRoadAgricultureOptions,
        MobileOffRoadConstructionOptions,
        MobilePassangerCarOptions,
        MobileRailOptions,
        MobileTransportOnsiteOptions,
        MobileWaterTransportOptions);
}

export function getFuelTypesFromMeter(meter: IdbUtilityMeter): Array<FuelTypeOption> {
    if (meter.vehicleCategory == 1) {
        return MobileTransportOnsiteOptions;
    } else {
        let vehicleType: VehicleType = VehicleTypes.find(vType => {
            return vType.value == meter.vehicleType;
        });
        if (vehicleType) {
            return vehicleType.fuelOptions;
        }
    }
}