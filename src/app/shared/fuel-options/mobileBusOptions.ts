import { FuelTypeOption } from "./fuelTypeOption";

export const MobileBusOptions: Array<FuelTypeOption> = [
    //No Gasoline or Diesel values for busses in document (Use Heavy Duty?)
    // {
    //     startingUnit: 'gal',
    //     heatCapacityValue: .12760,
    //     value: 'Gasoline',
    //     siteToSourceMultiplier: 1,
    //     emissionsOutputRate: 67.1338,
    //     CO2: 66.88,
    //     //YEAR USED: 2020
    //     //CH4 and N2O in g/mile
    //     CH4: .0079,
    //     N2O: .0012
    // },
    // {
    //     startingUnit: 'gal',
    //     heatCapacityValue: .13869,
    //     value: 'Diesel',
    //     siteToSourceMultiplier: 1,
    //     emissionsOutputRate: 74.2138,
    //     CO2: 73.96,
    //     //YEAR USED: 2007-2020
    //     //CH4 and N2O in g/mile
    //     CH4: .0290,
    //     N2O: .0214
    // },
    {
        startingUnit: 'gal',
        heatCapacityValue: .084,
        value: 'Ethanol (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 68.50028,
        CO2: 5.75,
        //CH4 and N2O in g/mile
        CH4: .1020,
        N2O: .0470,
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
        CH4: .0100,
        N2O: .0110
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .128,
        value: 'Biodiesel (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.90028,
        CO2: 9.45,
        //CH4 and N2O in g/mile
        CH4: .0090,
        N2O: .0430,
        isBiofuel: true
    },

]