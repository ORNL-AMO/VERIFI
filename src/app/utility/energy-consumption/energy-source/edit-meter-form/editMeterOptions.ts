export interface FuelTypeOption {
    startingUnit: string,
    heatCapacityValue: number
    value: string,
    siteToSourceMultiplier: number,
    otherEnergyType?: string
}

export const SourceOptions: Array<string> = [
    "Electricity",
    "Natural Gas",
    "Other Fuels",
    "Other Energy",
    "Water",
    "Waste Water",
    "Other Utility"
]

export const GasOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'ft3',
        heatCapacityValue: .00009,
        value: 'Blast Furnace Gas',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .00059,
        value: 'Coke Oven Gas',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0027,
        value: 'Liquefied Petroleum Gas (LPG)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .002816,
        value: 'Propane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .00328,
        value: 'Butane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0031,
        value: 'Isobutane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0006,
        value: 'Landfill Gas',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0007,
        value: 'Oil Gases',
        siteToSourceMultiplier: 1
    }
]

export const LiquidOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .0916476,
        value: 'Propane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .0916476,
        value: 'LPG',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Distillate Fuel Oil',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .14969,
        value: 'Residual Fuel Oil',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Heating Oil',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .102032,
        value: 'Butane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .10375,
        value: 'Isobutane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1108,
        value: 'Pentane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .012072,
        value: 'Ethylene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .017473,
        value: 'Propylene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .023008,
        value: 'Butene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .028693,
        value: 'Pentene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .028057,
        value: 'Benzene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .03354,
        value: 'Toluene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .03912,
        value: 'Xylene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .006492,
        value: 'Methyl Alcohol',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .011968,
        value: 'Ethyl Alcohol',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1374,
        value: 'Fuel Oil #1',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1396,
        value: 'Fuel Oil #2',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1451,
        value: 'Fuel Oil #4',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1488,
        value: 'Fuel Oil #5',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1524,
        value: 'Fuel Oil #6 (high sulfur)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .149,
        value: 'Fuel Oil #6 (low sulfur)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1387,
        value: 'Crude Oil',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1351,
        value: 'Kerosene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .138,
        value: 'Gas Oil',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .086,
        value: 'Liquefied Natural Gas (LNG)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .127,
        value: 'Biodiesel (100%)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .084262,
        value: 'Ethanol (100%)',
        siteToSourceMultiplier: 1
    }

]

export const SolidOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'ton',
        heatCapacityValue: 25.09,
        value: 'Coal (anthracite)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'ton',
        heatCapacityValue: 24.93,
        value: 'Coal (bituminous)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .014,
        value: 'Coal',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .013,
        value: 'Coke',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .006,
        value: 'Peat',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .008,
        value: 'Wood',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .009,
        value: 'Biomass',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .0065,
        value: 'Black Liquor',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .016,
        value: 'Scrap Tires',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .004,
        value: 'Sulfur',
        siteToSourceMultiplier: 1
    }
]

export const OtherEnergyOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'lb',
        heatCapacityValue: undefined,
        value: 'Purchased Steam',
        siteToSourceMultiplier: 1.33,
        otherEnergyType: 'Steam'
    },
    {
        startingUnit: 'tonHr',
        heatCapacityValue: .012,
        value: 'Purchased Chilled Water (Absorption Chiller)',
        siteToSourceMultiplier: 1.25,
        otherEnergyType: 'Chilled Water'
    },
    {
        startingUnit: 'tonHr',
        heatCapacityValue: .012,
        value: 'Purchased Chilled Water (Electric-driven Compressor)',
        siteToSourceMultiplier: .24,
        otherEnergyType: 'Chilled Water'
    },
    {
        startingUnit: 'tonHr',
        heatCapacityValue: .012,
        value: 'Purchased Chilled Water (Engine-driven Compressor)',
        siteToSourceMultiplier: .83,
        otherEnergyType: 'Chilled Water'
    },
    {
        startingUnit: 'Therm',
        heatCapacityValue: .1,
        value: 'District Hot Water',
        siteToSourceMultiplier: undefined,
        otherEnergyType: 'Hot Water'
    }
]