import { MeterPhase, MeterSource } from "src/app/models/constantsAndTypes";
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
import { IdbCustomFuel } from "src/app/models/idbModels/customFuel";



export function getFuelTypeOptions(source: MeterSource, phase: MeterPhase, customFuels: Array<IdbCustomFuel>, scope: number, vehicleCategory: number, vehicleType: number): Array<FuelTypeOption> {
    if (source == 'Other Fuels') {
        if (scope == 1) {
            //scope 1 stationary
            let sourceCustomFuels: Array<IdbCustomFuel> = customFuels.filter(cFuel => {
                return cFuel.phase == phase && cFuel.isMobile == false
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
            return getMobileFuelTypes(vehicleCategory, vehicleType, customFuels);
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

export function getMobileFuelTypes(vehicleCategory: number, vehicleType: number, customMobileFuels: Array<IdbCustomFuel>): Array<FuelTypeOption> {
    let fuels: Array<FuelTypeOption> = [];

    if (vehicleCategory == 1 || vehicleCategory == 3 || vehicleCategory == 4) {
        fuels = customMobileFuels.filter(fuel => {
            return fuel.isMobile == true && fuel.isOnRoad == false;
        });
    } else {
        fuels = customMobileFuels.filter(fuel => {
            return fuel.isMobile == true && fuel.isOnRoad == true;
        });
    }

    if (vehicleCategory == 1) {
        MobileTransportOnsiteOptions.forEach(transportOption => {
            fuels.push(transportOption);
        })
    } else {
        let vehicle: VehicleType = VehicleTypes.find(vType => {
            return vType.value == vehicleType;
        });
        if (vehicle) {
            vehicle.fuelOptions.forEach(option => {
                fuels.push(option);
            })
        }
    }
    return fuels;
}