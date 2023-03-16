import { MeterSource } from "../models/idb";
import { EnergyUnitOptions, UnitOption } from "./unitOptions";

export function getGUID(): string {
    return Math.random().toString(36).substr(2, 9);
}

export function getIsEnergyUnit(unit: string): boolean {
    let findEnergyUnit: UnitOption = EnergyUnitOptions.find(unitOption => { return unitOption.value == unit });
    return findEnergyUnit != undefined;
}


export function getIsEnergyMeter(source: MeterSource): boolean {
    if (source == 'Electricity' || source == 'Natural Gas' || source == 'Other Fuels' || source == 'Other Energy') {
        return true;
    } else {
        return false;
    }
}