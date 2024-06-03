import { FuelTypeOption } from "./fuelTypeOption";

export const StationaryGasOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'ft3',
        heatCapacityValue: .000092,
        value: 'Blast Furnace Gas',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 274.3504,
        CO2: 274.32,
        CH4: 0.022,
        N2O: 0.10
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .000599,
        value: 'Coke Oven Gas',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 46.8918,
        CO2: 46.85,
        CH4: .48,
        N2O: .1,
    },
    //CHECK VALUES LPG
    //emissionsOutputRate checks out
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0027,
        value: 'Liquefied Petroleum Gas (LPG)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.9638,
        CO2: 61.71,
        CH4: 3,
        N2O: .6,
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .002516,
        value: 'Propane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.7138,
        CO2: 61.46,
        CH4: 3,
        N2O: .6,
    },
    //CHECK VALUES Butane
    {
        startingUnit: 'ft3',
        heatCapacityValue: .00328,
        value: 'Butane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 64.0238,
        CO2: 64.77,
        CH4: 3,
        N2O: .6,
    },
    //CHECK VALUES Isobutane
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0031,
        value: 'Isobutane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 64.94,
        CO2: 64.94,
        CH4: 3,
        N2O: .6,
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .000485,
        value: 'Landfill Gas',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 52.33774,
        CO2: 52.07,
        CH4: 3.2,
        N2O: .63,
        isBiofuel: true
    }
]