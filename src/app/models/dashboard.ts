import { MonthlyData } from "./calanderization";
import { IdbFacility, IdbUtilityMeter } from "./idb";


export interface AccountFacilitiesSummary {
    facilitySummaries: Array<FacilitySummary>,
    totalEnergyUse: number,
    totalEnergyCost: number,
    totalNumberOfMeters: number,
    totalMarketEmissions: number,
    totalLocationEmissions: number,
    allMetersLastBill: MonthlyData
}

export interface FacilitySummary {
    facility: IdbFacility,
    energyUsage: number,
    energyCost: number,
    marketEmissions: number,
    locationEmissions: number,
    numberOfMeters: number,
    lastBillDate: Date
}


export interface FacilityMeterSummaryData {
    meterSummaries: Array<MeterSummary>,
    totalEnergyUse: number,
    totalEnergyCost: number,
    totalMarketEmissions: number,
    totalLocationEmissions: number,
    allMetersLastBill: MonthlyData
}


export interface MeterSummary {
    meter: IdbUtilityMeter,
    energyUsage: number,
    energyCost: number,
    marketEmissions: number,
    locationEmissions: number,
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
    previousMonthLocationEmissions: number,
    previousMonthMarketEmissions: number,
    averageEnergyUse: number,
    averageEnergyCost: number,
    averageLocationEmissions: number,
    averageMarketEmissions: number,
    yearPriorEnergyUse: number,
    yearPriorEnergyCost: number,
    yearPriorLocationEmissions: number,
    yearPriorMarketEmissions: number,
    energyUseChangeSinceLastYear: number,
    energyCostChangeSinceLastYear: number,
    locationEmissionsChangeSinceLastYear: number,
    marketEmissionsChangeSinceLastYear: number,
    utility: string
}
