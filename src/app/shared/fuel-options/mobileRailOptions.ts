import { FuelTypeOption } from "./fuelTypeOption";

export const MobileRailOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2138,
        CO2: 10.21,
        //CH4 and N2O in g/mile
        CH4: .38,
        N2O: .95
    }
]