import { MeterSource } from "../models/constantsAndTypes";
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

export function checkShowSiteToSource(source: MeterSource, includeInEnergy: boolean): boolean {
    if (!includeInEnergy) {
        return false;
    } else if (source == "Electricity" || source == "Natural Gas" || source == 'Other Energy') {
        return true;
    } else {
        return false;
    }
}