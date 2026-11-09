import { ConvertValue } from '@domain/calculations/conversions/convertValue';

export function calculateRatedPower(ratedCapacityPerHour: number, heatCapacity: number): number {
    if (!Number.isFinite(ratedCapacityPerHour) || !Number.isFinite(heatCapacity)) {
        return NaN;
    }
    return ratedCapacityPerHour * heatCapacity;
}

export function calculateRatedPowerWithUnitConversion(
    ratedCapacityPerHour: number,
    heatCapacity: number,
    heatCapacityEnergyUnit: string,
    heatCapacityPhysicalUnit: string,
    ratedPowerEnergyUnit: string,
    ratedCapacityPhysicalUnit: string
): number {
    const convertedHeatCapacity = convertHeatCapacityUnits(
        heatCapacity,
        heatCapacityEnergyUnit,
        heatCapacityPhysicalUnit,
        ratedPowerEnergyUnit,
        ratedCapacityPhysicalUnit
    );
    return calculateRatedPower(ratedCapacityPerHour, convertedHeatCapacity);
}

export function convertHeatCapacityUnits(
    heatCapacity: number,
    fromEnergyUnit: string,
    fromPhysicalUnit: string,
    toEnergyUnit: string,
    toPhysicalUnit: string
): number {
    if (!Number.isFinite(heatCapacity) || !fromEnergyUnit || !fromPhysicalUnit || !toEnergyUnit || !toPhysicalUnit) {
        return NaN;
    }

    const energyConversion = new ConvertValue(heatCapacity, fromEnergyUnit, toEnergyUnit);
    const physicalUnitConversion = new ConvertValue(1, fromPhysicalUnit, toPhysicalUnit);
    const convertedEnergy = energyConversion.convertedValue;
    const physicalUnitFactor = physicalUnitConversion.convertedValue;

    if (energyConversion.hasError || physicalUnitConversion.hasError
        || !Number.isFinite(convertedEnergy) || !Number.isFinite(physicalUnitFactor) || physicalUnitFactor === 0) {
        return NaN;
    }
    return convertedEnergy / physicalUnitFactor;
}
