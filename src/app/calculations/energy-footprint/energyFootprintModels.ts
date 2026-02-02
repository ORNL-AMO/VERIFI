
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

export interface FootprintEquipmentAnnualResult {
    equipmentGuid: string,
    equipmentName: string,
    color: string,
    annualResults: Array<FootprintAnnualResult>
}

export interface FootprintAnnualResult {
    year: number,
    energyUse: number,
    percentOfTotal: number
}