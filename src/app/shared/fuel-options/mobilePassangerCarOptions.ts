import { FuelTypeOption } from "./fuelTypeOption";

export const MobilePassangerCarOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 67.1338,
        CO2: 8.78,
        //YEAR USED: 2020
        //CH4 and N2O in g/mile
        CH4: .005,
        N2O: .0014
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2138,
        CO2: 10.21,
        //YEAR USED: 2007-2020
        //CH4 and N2O in g/mile
        CH4: .0302,
        N2O: .0192
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .084,
        value: 'Ethanol (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 68.50028,
        CO2: 5.75,
        //CH4 and N2O in g/mile
        CH4: .0150,
        N2O: .0040,
        isBiofuel: true
    },
    //NEEDED: Compressed Natural Gas (CNG)
    /*
    * {}
    */

    {
        startingUnit: 'gal',
        heatCapacityValue: .092,
        value: 'LPG',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.9638,
        CO2: 5.68,
        //CH4 and N2O in g/mile
        CH4: .0150,
        N2O: .0040
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .128,
        value: 'Biodiesel (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.90028,
        CO2: 9.45,
        //CH4 and N2O in g/mile
        CH4: .0300,
        N2O: .019,
        isBiofuel: true
    },

]