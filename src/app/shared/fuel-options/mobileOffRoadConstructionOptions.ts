import { FuelTypeOption } from "./fuelTypeOption";

export const MobileOffRoadConstructionOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline (2-stroke)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 8.78,
        //CH4 and N2O in g/gallon
        CH4: 7.98,
        N2O: .12,
        isMobile: true
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline (4-stroke)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 8.78,
        //CH4 and N2O in g/gallon
        CH4: 2.85,
        N2O: 1.47,
        isMobile: true
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 10.21,
        //CH4 and N2O in g/gallon
        CH4: 1.01,
        N2O: .94,
        isMobile: true
    },

    {
        startingUnit: 'gal',
        heatCapacityValue: .092,
        value: 'LPG',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 5.68,
        //CH4 and N2O in g/gallon
        CH4: .59,
        N2O: .5,
        isMobile: true
    }
]