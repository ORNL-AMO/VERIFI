import { FuelTypeOption } from "./fuelTypeOption";

export const MobileHeavyDutyTruckOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 8.78,
        //YEAR USED: 2020
        //CH4 and N2O in g/mile
        CH4: .0328,
        N2O: .0098,
        isMobile: true,
        isOnRoad: true
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 10.21,
        //YEAR USED: 2007-2020
        //CH4 and N2O in g/mile
        CH4: .0095,
        N2O: .0431,
        isMobile: true,
        isOnRoad: true
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .084,
        value: 'Ethanol (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 5.75,
        //CH4 and N2O in g/mile
        CH4: .0750,
        N2O: .0280,
        isBiofuel: true,
        isMobile: true,
        isOnRoad: true
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
        emissionsOutputRate: undefined,
        CO2: 5.68,
        //CH4 and N2O in g/mile
        CH4: .0030,
        N2O: .0070,
        isMobile: true,
        isOnRoad: true
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .128,
        value: 'Biodiesel (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 9.45,
        //CH4 and N2O in g/mile
        CH4: .0090,
        N2O: .0430,
        isBiofuel: true,
        isMobile: true,
        isOnRoad: true
    },

]