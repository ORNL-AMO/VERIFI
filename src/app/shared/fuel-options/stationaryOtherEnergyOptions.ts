import { FuelTypeOption } from "./fuelTypeOption";

export const StationaryOtherEnergyOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'lb',
        heatCapacityValue: undefined,
        value: 'Purchased Steam',
        siteToSourceMultiplier: 1.33,
        otherEnergyType: 'Steam',
        emissionsOutputRate: 66.3985,
        CO2: 0,
        CH4: 0,
        N2O: 0
    },
    {
        startingUnit: 'tonHr',
        heatCapacityValue: .012,
        value: 'Purchased Chilled Water (Absorption Chiller)',
        siteToSourceMultiplier: 1.25,
        otherEnergyType: 'Chilled Water',
        emissionsOutputRate: 73.89,
        CO2: 0,
        CH4: 0,
        N2O: 0
    },
    {
        startingUnit: 'tonHr',
        heatCapacityValue: .012,
        value: 'Purchased Chilled Water (Electric-driven Compressor)',
        siteToSourceMultiplier: .24,
        otherEnergyType: 'Chilled Water',
        emissionsOutputRate: 52.7,
        CO2: 0,
        CH4: 0,
        N2O: 0
    },
    {
        startingUnit: 'tonHr',
        heatCapacityValue: .012,
        value: 'Purchased Chilled Water (Engine-driven Compressor)',
        siteToSourceMultiplier: .83,
        otherEnergyType: 'Chilled Water',
        emissionsOutputRate: 49.31,
        CO2: 0,
        CH4: 0,
        N2O: 0
    },
    {
        startingUnit: 'Therm',
        heatCapacityValue: .1,
        value: 'District Hot Water',
        siteToSourceMultiplier: undefined,
        otherEnergyType: 'Hot Water',
        emissionsOutputRate: 66.3985,
        CO2: 0,
        CH4: 0,
        N2O: 0
    },
    {
        startingUnit: 'SCF',
        heatCapacityValue: 0.00001093,
        value: 'Purchased Compressed Air',
        siteToSourceMultiplier: 3,
        otherEnergyType: 'Compressed Air',
        emissionsOutputRate: undefined,
        CO2: 0,
        CH4: 0,
        N2O: 0
    }
]
