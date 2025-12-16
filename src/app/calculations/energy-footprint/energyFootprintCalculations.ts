import { EnergyEquipmentOperatingConditionsData, EquipmentUtilityData, IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";

export function setEnergyFootprintEnergyUse(energyUseEquipment: IdbFacilityEnergyUseEquipment) {
    energyUseEquipment.operatingConditionsData.forEach(operatingConditionYear => {
        energyUseEquipment.utilityData.forEach(utilityData => {
            let yearIndex: number = utilityData.energyUse.findIndex(eu => eu.year == operatingConditionYear.year);
            if (yearIndex != -1) {
                let yearIndex: number = utilityData.energyUse.findIndex(eu => eu.year == operatingConditionYear.year);
                utilityData.energyUse[yearIndex].energyUse = calculateTotalEnergyUse(operatingConditionYear, utilityData);
            }
        })
    });
}

export function calculateTotalEnergyUse(operatingConditions: EnergyEquipmentOperatingConditionsData, utilityData: EquipmentUtilityData): number {
    //Basic calculation: Size * Number of Equipment * Hours of Operation * Load Factor * Duty Factor * Efficiency
    let energyUse: number = utilityData.size
        * utilityData.numberOfEquipment
        * operatingConditions.hoursOfOperation
        * (operatingConditions.loadFactor / 100)
        * (operatingConditions.dutyFactor / 100)
        / (operatingConditions.efficiency / 100);
    //TODO: Unit conversions
    return energyUse;
}
