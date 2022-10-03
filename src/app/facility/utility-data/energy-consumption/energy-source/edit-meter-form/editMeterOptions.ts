import { MeterSource } from "src/app/models/idb"

export interface FuelTypeOption {
    startingUnit: string,
    heatCapacityValue: number
    value: string,
    siteToSourceMultiplier: number,
    emissionsOutputRate: number,
    otherEnergyType?: string
}

export const SourceOptions: Array<MeterSource> = [
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
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 274.32
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .00059,
        value: 'Coke Oven Gas',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 46.85
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0027,
        value: 'Liquefied Petroleum Gas (LPG)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.71
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .002816,
        value: 'Propane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.46
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .00328,
        value: 'Butane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 64.77
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0031,
        value: 'Isobutane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 64.94
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0006,
        value: 'Landfill Gas',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 52.07
    }
]

export const LiquidOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .0916476,
        value: 'Propane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 62.87
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .0916476,
        value: 'LPG',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.71
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Distillate Fuel Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.08
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .14969,
        value: 'Residual Fuel Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.02
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Heating Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.08
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.96
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .102032,
        value: 'Butane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 64.77
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .10375,
        value: 'Isobutane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 64.94
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1108,
        value: 'Pentane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 70.02
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .012072,
        value: 'Ethylene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 65.96
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .017473,
        value: 'Propylene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 67.77
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1374,
        value: 'Fuel Oil #1',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.25
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1396,
        value: 'Fuel Oil #2',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.96
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1451,
        value: 'Fuel Oil #4',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.04
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1488,
        value: 'Fuel Oil #5',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 72.93
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1524,
        value: 'Fuel Oil #6 (high sulfur)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .149,
        value: 'Fuel Oil #6 (low sulfur)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1387,
        value: 'Crude Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.54
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 70.22
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1351,
        value: 'Kerosene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.2
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .138,
        value: 'Gas Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.92
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .086,
        value: 'Liquefied Natural Gas (LNG)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.71
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .127,
        value: 'Biodiesel (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.84
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .084262,
        value: 'Ethanol (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 68.44
    }

]

export const SolidOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'ton',
        heatCapacityValue: 25.09,
        value: 'Coal (anthracite)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 103.69
    },
    {
        startingUnit: 'ton',
        heatCapacityValue: 24.93,
        value: 'Coal (bituminous)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 93.28
    },
    {
        startingUnit: 'ton',
        heatCapacityValue: 14.21,
        value: 'Coal (Lignite)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 97.72
    },
    {
        startingUnit: 'ton',
        heatCapacityValue: 17.25,
        value: 'Coal (subbituminous)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 97.17
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .013,
        value: 'Coke',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 113.67
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .006,
        value: 'Peat',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 111.84
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .008,
        value: 'Wood',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 93.8
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .004125,
        value: 'Biomass',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 118.17
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .0065,
        value: 'Black Liquor',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 94.5
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .016,
        value: 'Scrap Tires',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 85.97
    }
]

export const OtherEnergyOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'lb',
        heatCapacityValue: undefined,
        value: 'Purchased Steam',
        siteToSourceMultiplier: 1.33,
        otherEnergyType: 'Steam',
        emissionsOutputRate: 66.4
    },
    {
        startingUnit: 'tonHr',
        heatCapacityValue: .012,
        value: 'Purchased Chilled Water (Absorption Chiller)',
        siteToSourceMultiplier: 1.25,
        otherEnergyType: 'Chilled Water',
        emissionsOutputRate: 73.89
    },
    {
        startingUnit: 'tonHr',
        heatCapacityValue: .012,
        value: 'Purchased Chilled Water (Electric-driven Compressor)',
        siteToSourceMultiplier: .24,
        otherEnergyType: 'Chilled Water',
        emissionsOutputRate: 52.7
    },
    {
        startingUnit: 'tonHr',
        heatCapacityValue: .012,
        value: 'Purchased Chilled Water (Engine-driven Compressor)',
        siteToSourceMultiplier: .83,
        otherEnergyType: 'Chilled Water',
        emissionsOutputRate: 49.31
    },
    {
        startingUnit: 'Therm',
        heatCapacityValue: .1,
        value: 'District Hot Water',
        siteToSourceMultiplier: undefined,
        otherEnergyType: 'Hot Water',
        emissionsOutputRate: 66.4
    }
]


export const ScopeOptions: Array<ScopeOption> = [
    {
        optionLabel: 'Stationary',
        value: 1,
        scope: 'Scope 1'
    },
     {
        optionLabel: 'Mobile',
        value: 2,
        scope: 'Scope 1'
    },
    {
        optionLabel: 'Purchased Electricity',
        value: 3,
        scope: 'Scope 2'
    },
    {
        optionLabel: 'Other',
        value: 4,
        scope: 'Scope 2'
    }
]

export interface ScopeOption {
    optionLabel: string, 
    value: number, 
    scope: 'Scope 1' | 'Scope 2'
}


export const AgreementTypes: Array<AgreementType> = [
    {
        typeLabel: 'Grid',
        value: 1
    },
    {
        typeLabel: 'Self-generated',
        value: 2
    },
    {
        typeLabel: 'Physical Power Purchase Agreement (PPPA)',
        value: 3
    },
    {
        typeLabel: 'Virtual Power Purchase Agreement (VPPA)',
        value: 4
    },
    {
        typeLabel: 'Utility Green Product',
        value: 5
    },
    {
        typeLabel: 'Renewable Energy Credits (RECs)',
        value: 6
    }
]


export interface AgreementType {
    typeLabel: string,
    value: number
}