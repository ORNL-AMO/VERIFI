import { EmissionsResults } from "./eGridEmissions"

export interface StackedBarChartData {
    facilityName: string
    electricity: UtilityItem,
    naturalGas: UtilityItem,
    otherFuels: UtilityItem,
    otherEnergy: UtilityItem,
    water: UtilityItem,
    wasteWater: UtilityItem,
    otherUtility: UtilityItem
}

export interface UtilityItem {
    energyUse: number,
    energyCost: number,
}

export interface YearMonthData extends EmissionsResults {
    yearMonth: {
        year: number,
        month: string,
        fiscalYear: number
    },
    energyUse: number,
    energyCost: number,
    consumption: number
}