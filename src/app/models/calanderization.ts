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
    date: Date
}


export interface LastYearData {
    time: string,
    energyUse: number,
    energyCost: number,
    energyConsumption: number,
    date: Date
}


export interface CalanderizationFilters {
    showAllSources: boolean;
    selectedSources: Array<{
      source: string,
      selected: boolean
    }>;
    selectedDateMin: {
      year: number,
      month: number
    },
    selectedDateMax: {
      year: number,
      month: number
    },
    dataDateRange: {
      minDate: Date,
      maxDate: Date
    }
  }