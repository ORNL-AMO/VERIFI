import { FuelTypeOption } from "./fuelTypeOption";

export const MobileOffRoadAgricultureOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline (2-stroke)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 67.1338,
        CO2: 8.78,
        //CH4 and N2O in g/mile
        CH4: 6.92,
        N2O: .47
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline (4-stroke)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 67.1338,
        CO2: 8.78,
        //CH4 and N2O in g/mile
        CH4: 1.93,
        N2O: 1.2
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2138,
        CO2: 10.21,
        //YEAR USED: 2007-2020
        //"Diesel Equiment" not "Diesel Off-Road Trucks"
        CH4: 1.27,
        N2O: 1.07
    },

    {
        startingUnit: 'gal',
        heatCapacityValue: .092,
        value: 'LPG',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.9638,
        CO2: 5.68,
        //CH4 and N2O in g/mile
        CH4: .33,
        N2O: .94
    }
]