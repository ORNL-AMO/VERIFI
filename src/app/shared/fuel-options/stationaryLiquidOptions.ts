import { FuelTypeOption } from "./fuelTypeOption";

export const StationaryLiquidOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .0916476,
        value: 'Propane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 63.1238,
        CO2: 62.87,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .092,
        value: 'LPG',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.9638,
        CO2: 61.71,
        CH4: 3,
        N2O: .6
    },
    //CHECK VALUES Distillate Fuel Oil (1,2,3?)
    //using 2
    //Math give emissions rate 74.2137999
    {
        startingUnit: 'gal',
        heatCapacityValue: .141,
        value: 'Distillate Fuel Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.33713,
        CO2: 73.96,
        CH4: 3.0,
        N2O: .6
    },
    //CHECK VALUES: Residual Fuel Oil (No. 5, 6?)
    //using 5
    //Math gives emissions rate 75.353799
    {
        startingUnit: 'gal',
        heatCapacityValue: .145,
        value: 'Residual Fuel Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2688,
        CO2: 72.93,
        CH4: 3,
        N2O: .6
    },
    //DOESN'T Exist in table (Residual)
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Heating Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.33713,
        CO2: 0,
        CH4: 0,
        N2O: 0
    },
    //Fuel oil #2
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2138,
        CO2: 73.96,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .102032,
        value: 'Butane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 65.0238,
        CO2: 64.77,
        CH4: 3.0,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .099,
        value: 'Isobutane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 65.1938,
        CO2: 64.94,
        CH4: 3,
        N2O: .6
    },
    //CHECK VALUE: Pentanes = Pentanes Plus ?
    //Math gives emissions rate 70.2738
    {
        startingUnit: 'gal',
        heatCapacityValue: .1108,
        value: 'Pentane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 70.0738,
        CO2: 70.02,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .058,
        value: 'Ethylene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 66.2138,
        CO2: 65.96,
        CH4: 3.0,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .091,
        value: 'Propylene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 68.0238,
        CO2: 67.77,
        CH4: 3.0,
        N2O: .6
    },
    //CHECK VALUES: All Fuel Oils #x HHV doesn't match table
    //emissionsOutputRates check out
    {
        startingUnit: 'gal',
        heatCapacityValue: .1374,
        value: 'Fuel Oil #1',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.5038,
        CO2: 73.25,
        CH4: 3.0,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1396,
        value: 'Fuel Oil #2',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2138,
        CO2: 73.96,
        CH4: 3.0,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1451,
        value: 'Fuel Oil #4',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.2938,
        CO2: 75.04,
        CH4: 3.0,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1488,
        value: 'Fuel Oil #5',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.1838,
        CO2: 72.93,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1524,
        value: 'Fuel Oil #6 (high sulfur)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.3538,
        CO2: 75.10,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .149,
        value: 'Fuel Oil #6 (low sulfur)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.3538,
        CO2: 75.10,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1387,
        value: 'Crude Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.7938,
        CO2: 74.54,
        CH4: 3.0,
        N2O: .6
    },
    //CHECK VALUES: Gasoline = Natural Gasoline?
    //emissionsOutputRate checks out.
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 67.1338,
        CO2: 66.88,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1351,
        value: 'Kerosene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.4538,
        CO2: 75.2,
        CH4: 3,
        N2O: .6
    },
    //CHECK VALUE: Gas Oil = Heavy Gas Oil?
    //emissionsOutputRate checks out.
    {
        startingUnit: 'gal',
        heatCapacityValue: .148,
        value: 'Gas Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.1738,
        CO2: 74.92,
        CH4: 3,
        N2O: .6
    },
    //CHECK VALUE: Liquefied Natural Gas = Natural Gasoline? 
    //emissionsOutputRate checks out.
    {
        startingUnit: 'gal',
        heatCapacityValue: .086,
        value: 'Liquefied Natural Gas (LNG)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 53.1148,
        CO2: 53.06,
        CH4: 1,
        N2O: .1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .128,
        value: 'Biodiesel (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.90028,
        CO2: 73.84,
        CH4: 1.1,
        N2O: .11,
        isBiofuel: true
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .084,
        value: 'Ethanol (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 68.50028,
        CO2: 68.44,
        CH4: 1.1,
        N2O: .11,
        isBiofuel: true
    }

]
