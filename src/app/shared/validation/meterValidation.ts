import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { checkShowHeatCapacity, checkShowSiteToSource } from "../sharedHelperFunctions";


export function isMeterInvalid(meter: IdbUtilityMeter): boolean {
    // Required fields (from form): name, source, fuel (sometimes), startingUnit, energyUnit
    if (!meter.name || meter.name.toString().trim() === "") return true;
    if (!meter.source || meter.source.toString().trim() === "") return true;
    if (!meter.startingUnit || meter.startingUnit.toString().trim() === "") return true;
    if (!meter.energyUnit || meter.energyUnit.toString().trim() === "") return true;

    // Fuel required for 'Other Fuels' (scope != 2) or 'Other Energy'
    if ((meter.source === 'Other Fuels' && meter.scope !== 2) || meter.source === 'Other Energy') {
        if (!meter.fuel || meter.fuel.toString().trim() === "") return true;
    }

    // Phase required for 'Other Fuels' (scope != 2)
    if (meter.source === 'Other Fuels' && meter.scope !== 2) {
        if (!meter.phase || meter.phase.toString().trim() === "") return true;
    }

    // Heat capacity required if checkShowHeatCapacity is true
    // (imported from sharedHelperFunctions)
    // Min 0
    if (checkShowHeatCapacity(meter.source, meter.startingUnit, meter.scope)) {
        if (meter.heatCapacity === undefined || meter.heatCapacity === null || isNaN(meter.heatCapacity) || meter.heatCapacity < 0) return true;
    }

    // Site to source required if checkShowSiteToSource is true, min 0
    if (checkShowSiteToSource(meter.source, meter.includeInEnergy, meter.scope)) {
        if (meter.siteToSource === undefined || meter.siteToSource === null || isNaN(meter.siteToSource) || meter.siteToSource < 0) return true;
    }

    // Water Intake Type required if source is 'Water Intake'
    if (meter.source === 'Water Intake') {
        if (!meter.waterIntakeType || meter.waterIntakeType.toString().trim() === "") return true;
    }

    // Water Discharge Type required if source is 'Water Discharge'
    if (meter.source === 'Water Discharge') {
        if (!meter.waterDischargeType || meter.waterDischargeType.toString().trim() === "") return true;
    }

    // Vehicle validations
    // Basic vehicle required if scope == 2
    if (meter.scope === 2) {
        if (!meter.vehicleCategory || meter.vehicleCategory.toString().trim() === "") return true;
    }
    // Additional vehicle required if scope == 2 and vehicleCategory != 1
    if (meter.scope === 2 && meter.vehicleCategory !== 1) {
        if (!meter.vehicleType || meter.vehicleType.toString().trim() === "") return true;
        if (!meter.vehicleCollectionType || meter.vehicleCollectionType.toString().trim() === "") return true;
        if (!meter.vehicleDistanceUnit || meter.vehicleDistanceUnit.toString().trim() === "") return true;
        if (!meter.vehicleFuelEfficiency || isNaN(meter.vehicleFuelEfficiency)) return true;
    }

    // Global warming potential required if scope == 5 or 6
    if (meter.scope === 5 || meter.scope === 6) {
        if (!meter.globalWarmingPotentialOption || meter.globalWarmingPotentialOption.toString().trim() === "") return true;
    }

    // Green purchase fraction: min 0, max 100 (form multiplies by 100)
    if (meter.greenPurchaseFraction !== undefined && meter.greenPurchaseFraction !== null) {
        if (meter.greenPurchaseFraction < 0 || meter.greenPurchaseFraction > 1) return true;
    }

    // Charges: each charge must have name and chargeType
    if (Array.isArray(meter.charges)) {
        for (const charge of meter.charges) {
            if (!charge.name || charge.name.toString().trim() === "") return true;
            if (!charge.chargeType || charge.chargeType.toString().trim() === "") return true;
        }
    }

    // All checks passed
    return false;
}