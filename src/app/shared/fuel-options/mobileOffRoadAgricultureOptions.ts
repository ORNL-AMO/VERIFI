import { FuelTypeOption } from "./fuelTypeOption";

export const MobileOffRoadAgricultureOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline (2-stroke)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 8.78,
        //CH4 and N2O in g/gallon
        CH4: 6.92,
        N2O: .47,
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
        CH4: 1.93,
        N2O: 1.2,
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
        CH4: 1.27,
        N2O: 1.07,
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
        CH4: .33,
        N2O: .94,
        isMobile: true
    }
]