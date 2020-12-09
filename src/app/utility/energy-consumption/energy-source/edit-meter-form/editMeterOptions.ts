export interface FuelTypeOption {
    startingUnit: string,
    conversionToMMtbu: number
    value: string,
    siteToSourceMultiplier: number
}

export const GasOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'SCF',
        conversionToMMtbu: .00009,
        value: 'Blast Furnace Gas',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'SCF',
        conversionToMMtbu: .00059,
        value: 'Coke Oven Gas',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'SCF',
        conversionToMMtbu: .0027,
        value: 'Liquefied Petroleum Gas (LPG)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'SCF',
        conversionToMMtbu: .002816,
        value: 'Propane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'SCF',
        conversionToMMtbu: .00328,
        value: 'Butane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'SCF',
        conversionToMMtbu: .0031,
        value: 'Isobutane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'SCF',
        conversionToMMtbu: .0006,
        value: 'Landfill Gas',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'SCF',
        conversionToMMtbu: .0007,
        value: 'Oil Gases',
        siteToSourceMultiplier: 1
    }
]

export const LiquidOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        conversionToMMtbu: .0916476,
        value: 'Propane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .0916476,
        value: 'LPG',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .13869,
        value: 'Distillate Fuel Oil',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .14969,
        value: 'Residual Fuel Oil',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .13869,
        value: 'Heating Oil',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .102032,
        value: 'Butane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .10375,
        value: 'Isobutane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .1108,
        value: 'Pentane',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .012072,
        value: 'Ethylene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .017473,
        value: 'Propylene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .023008,
        value: 'Butene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .028693,
        value: 'Pentene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .028057,
        value: 'Benzene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .03354,
        value: 'Toluene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .03912,
        value: 'Xylene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .006492,
        value: 'Methyl Alcohol',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .011968,
        value: 'Ethyl Alcohol',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .1374,
        value: 'Fuel Oil #1',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .1396,
        value: 'Fuel Oil #2',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .1451,
        value: 'Fuel Oil #4',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .1488,
        value: 'Fuel Oil #5',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .1524,
        value: 'Fuel Oil #6 (high sulfur)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .149,
        value: 'Fuel Oil #6 (low sulfur)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .1387,
        value: 'Crude Oil',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .12760,
        value: 'Gasoline',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .1351,
        value: 'Kerosene',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .138,
        value: 'Gas Oil',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .086,
        value: 'Liquefied Natural Gas (LNG)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .127,
        value: 'Biodiesel (100%)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'gal',
        conversionToMMtbu: .084262,
        value: 'Ethanol (100%)',
        siteToSourceMultiplier: 1
    }

]

export const SolidOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'Tons',
        conversionToMMtbu: 25.09,
        value: 'Coal (anthracite)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'Tons',
        conversionToMMtbu: 24.93,
        value: 'Coal (bituminous)',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: .014,
        value: 'Coal',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: .013,
        value: 'Coke',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: .006,
        value: 'Peat',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: .008,
        value: 'Wood',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: .009,
        value: 'Biomass',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: .0065,
        value: 'Black Liquor',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: .016,
        value: 'Scrap Tires',
        siteToSourceMultiplier: 1
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: .004,
        value: 'Sulfur',
        siteToSourceMultiplier: 1
    }
]

export const OtherEnergyOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'lb',
        conversionToMMtbu: .001194,
        value: 'District Steam (150 psig)',
        siteToSourceMultiplier: undefined
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: undefined,
        value: 'Purchased Steam',
        siteToSourceMultiplier: 1.33
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: .012,
        value: 'Purchased Chilled Water (Absorption Chiller)',
        siteToSourceMultiplier: 1.25
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: .012,
        value: 'Purchased Chilled Water (Electric-driven Compressor)',
        siteToSourceMultiplier: .24
    },
    {
        startingUnit: 'lb',
        conversionToMMtbu: .012,
        value: 'Purchased Chilled Water (Enginer-driven Compressor)',
        siteToSourceMultiplier: .83
    },
    {
        startingUnit: 'Therms',
        conversionToMMtbu: .1,
        value: 'District Hot Water',
        siteToSourceMultiplier: undefined
    }
]

export const FuelOptions: Array<string> = [

]


export const ElectricityUnits: Array<string> = [
    'kWh',
    'MWh'
]

export const GasUnits: Array<string> = [
    'SCF',
    'lbs'
]

export const SolidUnits: Array<string> = [
    'Tons',
    'lbs'
]

export const LiquidUnits: Array<string> = [
    'gal',
    'Ton/hr',
    'gal-F',
    'Therms'
]