import { IdbFacility, IdbUtilityMeter } from "./idb";

export interface FacilitySummary {
    facility: IdbFacility,
    energyUsage: number,
    energyCost: number,
    numberOfMeters: number,
    lastBillDate: Date
}


export interface MeterSummary {
    meter: IdbUtilityMeter,
    energyUsage: number,
    energyCost: number,
    lastBillDate: Date,
    groupName: string
}


export interface UtilityUsageSummaryData {
    utilitySummaries: Array<SummaryData>
    total: SummaryData
}

export interface SummaryData {
    lastBillDate: Date,
    previousMonthEnergyUse: number,
    previousMonthEnergyCost: number,
    averageEnergyUse: number,
    averageEnergyCost: number,
    utility: string
}
