import { FuelTypeOption } from "./fuelTypeOption";

export const MobileMotorcycleOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 67.1338,
        CO2: 8.78,
        //CH4 and N2O in g/mile
        CH4: .0070,
        N2O: .0083
    }
]