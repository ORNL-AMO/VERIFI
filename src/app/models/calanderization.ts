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
    fiscalYear: number,
    energyConsumption: number,
    energyUse: number,
    energyCost: number,
    date: Date,
    locationEmissions: number, 
    marketEmissions: number,    
    RECs: number,
    excessRECs: number, 
    excessRECsEmissions: number
}


export interface LastYearData {
    time: string,
    energyUse: number,
    energyCost: number,
    energyConsumption: number,
    locationEmissions: number, 
    marketEmissions: number, 
    RECs: number,
    excessRECs: number, 
    excessRECsEmissions: number,   
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
    groupType: 'Energy' | 'Water' | 'Other',
    id: string,
    meterGroupIds: Array<string>,
    totalUsage: number
  }


  export interface CalanderizationOptions {
    energyIsSource: boolean
  }