

export interface HeatMapData {
    resultData: Array<{ monthlyEnergy: Array<number>, monthlyCost: Array<number> }>,
    months: Array<string>,
    years: Array<number>,
    facilityName: string
}