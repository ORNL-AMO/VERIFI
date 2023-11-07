import { FuelTypeOption } from "./fuelTypeOption";

//TODO: Fill missing values...
export const MobileAircraftOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: undefined,
        value: 'Jet Fuel',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 9.75,
        //CH4 and N2O in g/gallon
        CH4: .0,
        N2O: .30,
        isMobile: true
    },    
    {
        startingUnit: 'gal',
        heatCapacityValue: undefined,
        value: 'Aviation Gasoline',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: undefined,
        CO2: 8.31,
        //CH4 and N2O in g/gallon
        CH4: 7.06,
        N2O: .11,
        isMobile: true
    }
]