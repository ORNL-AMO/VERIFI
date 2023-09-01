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
    scope1MarketEmissions: number,
    scope1LocationEmissions: number,
    scope2MarketEmissions: number,
    scope2LocationEmissions: number
}

export interface YearMonthData {
    yearMonth: {
        year: number,
        month: string,
        fiscalYear: number
    },
    energyUse: number,
    energyCost: number,
    marketEmissions: number,
    locationEmissions: number,
    consumption: number
}