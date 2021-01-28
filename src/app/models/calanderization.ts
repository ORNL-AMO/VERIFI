import { IdbUtilityMeter } from "./idb";

export interface CalanderizedMeter {
    meter: IdbUtilityMeter,
    consumptionUnit: string,
    monthlyData: Array<MonthlyData>,
    showConsumption: boolean,
    showEnergyUse: boolean,
    energyUnit: string
}

export interface MonthlyData {
    month: string,
    monthNumValue: number,
    year: number,
    energyConsumption: number,
    energyUse: number,
    energyCost: number,
}


export interface LastYearData {
    time: string,
    energyUse: number,
    energyCost: number,
    energyConsumption: number
}