
export interface AnnualFootprintGroupSourceResult {
    year: number,
    includedMetersEnergyUse: number,
    totalSourceEnergyUse: number,
    totalEquipmentEnergyUse: number,
    percentIncludedEnergyUse: number,
    percentTotalEnergyUse: number,
    equipmentEnergyUse: Array<{
        equipmentGuid: string,
        equipmentName: string,
        energyUse: number,
        percentOfTotal: number
    }>,
}