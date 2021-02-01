import { MonthlyData } from "./calanderization";
import { IdbFacility, IdbUtilityMeter } from "./idb";


export interface AccountFacilitiesSummary {
    facilitySummaries: Array<FacilitySummary>,
    totalEnergyUse: number,
    totalEnergyCost: number,
    totalNumberOfMeters: number,
    allMetersLastBill: MonthlyData
}

export interface FacilitySummary {
    facility: IdbFacility,
    energyUsage: number,
    energyCost: number,
    numberOfMeters: number,
    lastBillDate: Date
}


export interface FacilityMeterSummaryData {
    meterSummaries: Array<MeterSummary>,
    totalEnergyUse: number,
    totalEnergyCost: number,
    allMetersLastBill: MonthlyData
}


export interface MeterSummary {
    meter: IdbUtilityMeter,
    energyUsage: number,
    energyCost: number,
    lastBill: MonthlyData,
    groupName: string,
    lastBillDate: Date
}


export interface UtilityUsageSummaryData {
    utilitySummaries: Array<SummaryData>
    total: SummaryData,
    allMetersLastBill: MonthlyData
}

export interface SummaryData {
    lastBillDate: Date,
    previousMonthEnergyUse: number,
    previousMonthEnergyCost: number,
    averageEnergyUse: number,
    averageEnergyCost: number,
    yearPriorEnergyUse: number,
    yearPriorEnergyCost: number,
    utility: string
}
