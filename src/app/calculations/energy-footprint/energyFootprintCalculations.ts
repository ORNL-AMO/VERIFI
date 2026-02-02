import { EnergyEquipmentOperatingConditionsData, EquipmentUtilityData, IdbFacilityEnergyUseEquipment } from "src/app/models/idbModels/facilityEnergyUseEquipment";

export function setEnergyFootprintEnergyUse(energyUseEquipment: IdbFacilityEnergyUseEquipment) {
    energyUseEquipment.operatingConditionsData.forEach(operatingConditionYear => {
        energyUseEquipment.utilityData.forEach(utilityData => {
            let yearIndex: number = utilityData.energyUse.findIndex(eu => eu.year == operatingConditionYear.year);
            if (yearIndex != -1) {
                let yearIndex: number = utilityData.energyUse.findIndex(eu => eu.year == operatingConditionYear.year);
                utilityData.energyUse[yearIndex].energyUse = calculateTotalEquipmentEnergyUse(operatingConditionYear, utilityData);
            }
        })
    });
}

export function calculateTotalEquipmentEnergyUse(operatingConditions: EnergyEquipmentOperatingConditionsData, utilityData: EquipmentUtilityData): number {
    //Basic calculation: Size * Number of Equipment * Hours of Operation * Load Factor * Duty Factor * Efficiency
    let energyUse: number = utilityData.size
        * utilityData.numberOfEquipment
        * operatingConditions.hoursOfOperation
        * (operatingConditions.loadFactor / 100)
        * (operatingConditions.dutyFactor / 100)
        / (operatingConditions.efficiency / 100);

    // let unitOptions: Array<UnitOption> = getUnitOptionsForUtilityType(utilityData.energySource);
    // let unitOption: UnitOption = unitOptions.find(uo => uo.value == utilityData.units);
    // let energyUseUnit: string = getEnergyUseUnit(unitOption.value);
    // TODO: handle units conversion

    return energyUse;
}


export function getEnergyUseUnit(unitOptionValue: string): string {
    if (!unitOptionValue) return '';

    // Power units (e.g., kW, MW, hp, etc.)
    // Energy = Power * Time (hours)
    // Volume units (e.g., gal, m3, etc.)
    // Energy = Volume (for fuels, etc.)

    // Map of power units to energy units
    const powerToEnergyMap: { [key: string]: string } = {
        'kW': 'kWh',
        'MW': 'MWh',
        'W': 'Wh',
        'hp': 'hph',
        'btuhr': 'Btu',
        'MMBtuhr': 'MMBtu',
        'kJh': 'kJ',
        'GJh': 'GJ',
        'MJh': 'MJ',
    };

    // If the selected unit is a power unit, return the corresponding energy unit
    if (powerToEnergyMap[unitOptionValue]) {
        return powerToEnergyMap[unitOptionValue];
    }

    // If the selected unit is already an energy unit, return it as is
    // (e.g., kWh, MWh, MJ, GJ, Therms, etc.)
    const energyUnits = [
        'kWh', 'MWh', 'kJ', 'GJ', 'MJ', 'Therms', 'DTherms', 'MMBtu', 'kcal', 'hph'
    ];
    if (energyUnits.includes(unitOptionValue)) {
        return unitOptionValue;
    }

    // If the selected unit is a volume or mass unit, return the same unit (for reporting raw consumption)
    // (e.g., gal, m3, ft3, lb, kg, etc.)
    return unitOptionValue;
}