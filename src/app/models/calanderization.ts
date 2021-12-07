import { IdbUtilityMeter, IdbUtilityMeterGroup, MeterSource } from "./idb";

export interface CalanderizedMeter {
    meter: IdbUtilityMeter,
    consumptionUnit: string,
    monthlyData: Array<MonthlyData>,
    showConsumption: boolean,
    showEnergyUse: boolean,
    showEmissions: boolean,
    energyUnit: string,
}

export interface MonthlyData {
    month: string,
    monthNumValue: number,
    year: number,
    energyConsumption: number,
    energyUse: number,
    energyCost: number,
    date: Date,
    emissions: number
}


export interface LastYearData {
    time: string,
    energyUse: number,
    energyCost: number,
    energyConsumption: number,
    emissions: number,
    date: Date
}


export interface CalanderizationFilters {
    showAllSources: boolean;
    selectedSources: Array<{
      source: MeterSource,
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

  export interface MeterGroupType {
    meterGroups: Array<IdbUtilityMeterGroup>,
    groupType: string,
    id: string,
    meterGroupIds: Array<string>,
    totalUsage: number
  }