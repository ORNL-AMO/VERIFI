import { FuelTypeOption } from "./fuelTypeOption";

export const MobileWaterTransportOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline (2-stroke)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 8.78,
        //CH4 and N2O in g/gallon
        CH4: 4.61,
        N2O: .08,
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
        CH4: 2.25,
        N2O: .01,
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
        CH4: 6.41,
        N2O: .17,
        isMobile: true
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .145,
        value: 'Residual Fuel Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 8.78,
        //CH4 and N2O in g/gallon
        CH4: 1.11,
        N2O: .32,
        isMobile: true
    }
]