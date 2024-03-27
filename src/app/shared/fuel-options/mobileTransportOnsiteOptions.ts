import { FuelTypeOption } from "./fuelTypeOption";

//Onsite = stationary values
export const MobileTransportOnsiteOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 8.78,
        CH4: .005,
        N2O: .0014
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 10.21,
        CH4: .0302,
        N2O: .0192,
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .0916476,
        value: 'Propane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 62.87,
        CH4: 3,
        N2O: .6
    }

]