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
        heatCapacityValue: .000092,
        value: 'Blast Furnace Gas',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 274.3504
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .000599,
        value: 'Coke Oven Gas',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 46.8918
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0027,
        value: 'Liquefied Petroleum Gas (LPG)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.9638
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .002516,
        value: 'Propane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.7138
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .00328,
        value: 'Butane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 64.0238
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
        heatCapacityValue: .000485,
        value: 'Landfill Gas',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 52.33774
    }
]

export const LiquidOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .0916476,
        value: 'Propane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 63.1238
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .092,
        value: 'LPG',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.9638
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .141,
        value: 'Distillate Fuel Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.33713
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .145,
        value: 'Residual Fuel Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2688
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Heating Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.33713
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2138
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .102032,
        value: 'Butane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 65.0238
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .099,
        value: 'Isobutane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 65.1938
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1108,
        value: 'Pentane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 70.0738
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .058,
        value: 'Ethylene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 66.2138
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .091,
        value: 'Propylene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 68.0238
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1374,
        value: 'Fuel Oil #1',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.5038
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1396,
        value: 'Fuel Oil #2',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2138
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1451,
        value: 'Fuel Oil #4',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.2938
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1488,
        value: 'Fuel Oil #5',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.1838
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1524,
        value: 'Fuel Oil #6 (high sulfur)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.3538
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .149,
        value: 'Fuel Oil #6 (low sulfur)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.3538
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1387,
        value: 'Crude Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.7938
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 67.1338
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1351,
        value: 'Kerosene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.4538
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .148,
        value: 'Gas Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.1738
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .086,
        value: 'Liquefied Natural Gas (LNG)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 53.1148
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .128,
        value: 'Biodiesel (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.90028
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .084,
        value: 'Ethanol (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 68.50028
    }

]

export const SolidOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'ton',
        heatCapacityValue: 25.09,
        value: 'Coal (anthracite)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 104.4418
    },
    {
        startingUnit: 'ton',
        heatCapacityValue: 24.93,
        value: 'Coal (bituminous)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 94.0318
    },
    {
        startingUnit: 'ton',
        heatCapacityValue: 14.21,
        value: 'Coal (Lignite)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 98.4718
    },
    {
        startingUnit: 'ton',
        heatCapacityValue: 17.25,
        value: 'Coal (subbituminous)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 97.9218
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .013,
        value: 'Coke',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 104.4616
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .006,
        value: 'Peat',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 113.8916
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .008,
        value: 'Wood',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 95.0528
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .004125,
        value: 'Biomass',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 120.2216
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .0065,
        value: 'Black Liquor',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 94.65266
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .016,
        value: 'Scrap Tires',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 88.0216
    }
]

export const OtherEnergyOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'lb',
        heatCapacityValue: undefined,
        value: 'Purchased Steam',
        siteToSourceMultiplier: 1.33,
        otherEnergyType: 'Steam',
        emissionsOutputRate: 66.3985
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
        emissionsOutputRate: 66.3985
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
        typeLabel: 'On-site Generation',
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