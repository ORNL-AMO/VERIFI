import { MeterSource } from "src/app/models/constantsAndTypes";
import { EquipmentType } from "src/app/models/idbModels/facilityEnergyUseEquipment";
import { PowerUnitOptions, UnitOption, VolumeLiquidOptions } from "src/app/shared/unitOptions";

// export type UtilityType = 'Electricity' | 'Natural Gas' | 'Other Fuels' | 'Water' | 'Waste Water' | 'Steam' | 'Compressed Air';

export const EquipmentTypes: Array<EquipmentType> = ["Pump", "Fan", "Process Heating", "Compressed Air", "Steam",
    "Process Cooling", "Motor", "Lighting", "HVAC", "Mobile", "Other"];

export function getUtilityTypesForEquipmentType(equipmentType: EquipmentType): Array<MeterSource> {
    switch (equipmentType) {
        case "Pump":
            return ['Electricity'];
        case "Fan":
            return ['Electricity'];
        case "Process Heating":
            return ['Natural Gas', 'Other Fuels', 'Electricity', 'Other Energy'];
        case "Compressed Air":
            return ['Electricity', 'Other Energy'];
        case "Steam":
            return ['Natural Gas', 'Other Fuels', 'Electricity', 'Other Energy'];
        case "Process Cooling":
            return ['Electricity'];
        case "Motor":
            return ['Electricity'];
        case "Lighting":
            return ['Electricity'];
        case "HVAC":
            return ['Electricity'];
        // case "Mobile":
        //     return { equipmentType: type, utilityTypes: ['Electricity', 'Natural Gas', 'Other Fuels'],
        // defaultUnit: 'kW'};
        case "Other":
            return ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy'];

    }
}

export function getUnitOptionsForUtilityType(utilityType: MeterSource): Array<UnitOption> {
    if (utilityType == 'Electricity' || utilityType == 'Natural Gas') {
        return [...PowerUnitOptions];
    } else if (utilityType == 'Other Fuels' || utilityType == 'Other Energy') {
        return [...PowerUnitOptions, ...VolumeLiquidOptions];
    }
    return [];
}


// export const EquipmentTypeOptions:
//     Array<{
//         equipmentType: EquipmentType,
//         utilityTypes: Array<UtilityType>,
//         defaultUnit: string
//     }> = EquipmentTypes.map(type => {
//         switch (type) {
//             case "Pump":
//                 return {
//                     equipmentType: type, utilityTypes: ['Electricity'],
//                     defaultUnit: 'kW'
//                 };
//             case "Fan":
//                 return {
//                     equipmentType: type, utilityTypes: ['Electricity'],
//                     defaultUnit: 'kW'
//                 };
//             case "Process Heating":
//                 return {
//                     equipmentType: type, utilityTypes: ['Natural Gas', 'Other Fuels', 'Electricity', 'Steam'],
//                     defaultUnit: 'kW'
//                 };
//             case "Compressed Air":
//                 return {
//                     equipmentType: type, utilityTypes: ['Electricity', 'Compressed Air'],
//                     defaultUnit: 'kW'
//                 };
//             case "Steam":
//                 return {
//                     equipmentType: type, utilityTypes: ['Natural Gas', 'Other Fuels', 'Electricity', 'Steam'],
//                     defaultUnit: 'kW'
//                 };
//             case "Process Cooling":
//                 return {
//                     equipmentType: type, utilityTypes: ['Electricity'],
//                     defaultUnit: 'kW'
//                 };
//             case "Motor":
//                 return {
//                     equipmentType: type, utilityTypes: ['Electricity'],
//                     defaultUnit: 'kW'
//                 };
//             case "Lighting":
//                 return {
//                     equipmentType: type, utilityTypes: ['Electricity'],
//                     defaultUnit: 'W'
//                 };
//             case "HVAC":
//                 return {
//                     equipmentType: type, utilityTypes: ['Electricity'],
//                     defaultUnit: 'kW'
//                 };
//             // case "Mobile":
//             //     return { equipmentType: type, utilityTypes: ['Electricity', 'Natural Gas', 'Other Fuels'],
//             // defaultUnit: 'kW'};
//             case "Other":
//                 return {
//                     equipmentType: type, utilityTypes: ['Electricity', 'Natural Gas', 'Other Fuels', 'Steam', 'Compressed Air'],
//                     defaultUnit: 'kW'
//                 };
//         }
//     });
