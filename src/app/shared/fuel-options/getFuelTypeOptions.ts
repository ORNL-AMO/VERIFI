import { MeterPhase, MeterSource } from "src/app/models/constantsAndTypes";
import { IdbCustomFuel } from "src/app/models/idb";
import { FuelTypeOption } from "./fuelTypeOption";
import { StationarySolidOptions } from "./stationarySolidOptions";
import { StationaryLiquidOptions } from "./stationaryLiquidOptions";
import { StationaryGasOptions } from "./stationaryGasOptions";
import { StationaryOtherEnergyOptions } from "./stationaryOtherEnergyOptions";



export function getFuelTypeOptions(source: MeterSource, phase: MeterPhase, customFuels: Array<IdbCustomFuel>): Array<FuelTypeOption> {
    if (source == 'Other Fuels') {
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
    } else if (source == 'Other Energy') {
        return StationaryOtherEnergyOptions;
    }
    return [];
}