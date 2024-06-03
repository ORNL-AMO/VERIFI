import { FuelTypeOption } from "./fuelTypeOption";

export const StationarySolidOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'ton',
        heatCapacityValue: 25.09,
        value: 'Coal (anthracite)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 104.4418,
        CO2: 103.69,
        CH4: 11,
        N2O: 1.6
    },
    {
        startingUnit: 'ton',
        heatCapacityValue: 24.93,
        value: 'Coal (bituminous)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 94.0318,
        CO2: 93.28,
        CH4: 11,
        N2O: 1.6
    },
    {
        startingUnit: 'ton',
        heatCapacityValue: 14.21,
        value: 'Coal (Lignite)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 98.4718,
        CO2: 97.72,
        CH4: 11,
        N2O: 1.6
    },
    {
        startingUnit: 'ton',
        heatCapacityValue: 17.25,
        value: 'Coal (subbituminous)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 97.9218,
        CO2: 97.17,
        CH4: 11,
        N2O: 1.6
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .013,
        value: 'Coke',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 104.4616,
        CO2: 102.41,
        CH4: 32,
        N2O: 4.2
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .006,
        value: 'Peat',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 113.8916,
        CO2: 111.84,
        CH4: 32,
        N2O: 4.2,
        isBiofuel: true
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .008,
        value: 'Wood',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 95.0528,
        CO2: 93.8,
        CH4: 7.2,
        N2O: 3.6,
        isBiofuel: true
    },
    //CHECK VALUES: No solid biomass in table
    {
        startingUnit: 'lb',
        heatCapacityValue: .004125,
        value: 'Biomass',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 120.2216,
        CO2: 0,
        CH4: 0,
        N2O: 0,
        isBiofuel: true
    },
    //CHECK VALUES: No Black Liquor in table
    {
        startingUnit: 'lb',
        heatCapacityValue: .0065,
        value: 'Black Liquor',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 94.65266,
        CO2: 0,
        CH4: 0,
        N2O: 0,
        isBiofuel: true
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .016,
        value: 'Scrap Tires',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 88.0216,
        CO2: 85.97,
        CH4: 32,
        N2O: 4.2
    }
]
