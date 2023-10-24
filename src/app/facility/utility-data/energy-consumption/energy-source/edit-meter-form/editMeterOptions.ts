import { MeterPhase, MeterSource } from "src/app/models/constantsAndTypes"
import { IdbCustomFuel } from "src/app/models/idb";


export interface FuelTypeOption {
    startingUnit: string,
    heatCapacityValue: number
    value: string,
    siteToSourceMultiplier: number,
    emissionsOutputRate: number,
    otherEnergyType?: 'Hot Water' | 'Steam' | 'Compressed Air' | 'Chilled Water';
    CO2: number,
    CH4: number,
    N2O: number,
    isBiofuel?: boolean
}

export const SourceOptions: Array<MeterSource> = [
    "Electricity",
    "Natural Gas",
    "Other Fuels",
    "Other Energy",
    "Water Intake",
    "Water Discharge",
    "Other Utility"
]

export const GasOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'ft3',
        heatCapacityValue: .000092,
        value: 'Blast Furnace Gas',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 274.3504,
        CO2: 274.32,
        CH4: 0.022,
        N2O: 0.10
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .000599,
        value: 'Coke Oven Gas',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 46.8918,
        CO2: 46.85,
        CH4: .48,
        N2O: .1,
    },
    //CHECK VALUES LPG
    //emissionsOutputRate checks out
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0027,
        value: 'Liquefied Petroleum Gas (LPG)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.9638,
        CO2: 61.71,
        CH4: 3,
        N2O: .6,
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .002516,
        value: 'Propane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.7138,
        CO2: 61.46,
        CH4: 3,
        N2O: .6,
    },
    //CHECK VALUES Butane
    {
        startingUnit: 'ft3',
        heatCapacityValue: .00328,
        value: 'Butane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 64.0238,
        CO2: 64.77,
        CH4: 3,
        N2O: .6,
    },
    //CHECK VALUES Isobutane
    {
        startingUnit: 'ft3',
        heatCapacityValue: .0031,
        value: 'Isobutane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 64.94,
        CO2: 64.94,
        CH4: 3,
        N2O: .6,
    },
    {
        startingUnit: 'ft3',
        heatCapacityValue: .000485,
        value: 'Landfill Gas',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 52.33774,
        CO2: 52.07,
        CH4: 3.2,
        N2O: .63,
    }
]

export const LiquidOptions: Array<FuelTypeOption> = [
    {
        startingUnit: 'gal',
        heatCapacityValue: .0916476,
        value: 'Propane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 63.1238,
        CO2: 62.87,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .092,
        value: 'LPG',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 61.9638,
        CO2: 61.71,
        CH4: 3,
        N2O: .6
    },
    //CHECK VALUES Distillate Fuel Oil (1,2,3?)
    //using 2
    //Math give emissions rate 74.2137999
    {
        startingUnit: 'gal',
        heatCapacityValue: .141,
        value: 'Distillate Fuel Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.33713,
        CO2: 73.96,
        CH4: 3.0,
        N2O: .6
    },
    //CHECK VALUES: Residual Fuel Oil (No. 5, 6?)
    //using 5
    //Math gives emissions rate 75.353799
    {
        startingUnit: 'gal',
        heatCapacityValue: .145,
        value: 'Residual Fuel Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2688,
        CO2: 72.93,
        CH4: 3,
        N2O: .6
    },
    //DOESN'T Exist in table (Residual)
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Heating Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.33713,
        CO2: 0,
        CH4: 0,
        N2O: 0
    },
    //Fuel oil #2
    {
        startingUnit: 'gal',
        heatCapacityValue: .13869,
        value: 'Diesel',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2138,
        CO2: 73.96,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .102032,
        value: 'Butane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 65.0238,
        CO2: 64.77,
        CH4: 3.0,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .099,
        value: 'Isobutane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 65.1938,
        CO2: 64.94,
        CH4: 3,
        N2O: .6
    },
    //CHECK VALUE: Pentanes = Pentanes Plus ?
    //Math gives emissions rate 70.2738
    {
        startingUnit: 'gal',
        heatCapacityValue: .1108,
        value: 'Pentane',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 70.0738,
        CO2: 70.02,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .058,
        value: 'Ethylene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 66.2138,
        CO2: 65.96,
        CH4: 3.0,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .091,
        value: 'Propylene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 68.0238,
        CO2: 67.77,
        CH4: 3.0,
        N2O: .6
    },
    //CHECK VALUES: All Fuel Oils #x HHV doesn't match table
    //emissionsOutputRates check out
    {
        startingUnit: 'gal',
        heatCapacityValue: .1374,
        value: 'Fuel Oil #1',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.5038,
        CO2: 73.25,
        CH4: 3.0,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1396,
        value: 'Fuel Oil #2',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.2138,
        CO2: 73.96,
        CH4: 3.0,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1451,
        value: 'Fuel Oil #4',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.2938,
        CO2: 75.04,
        CH4: 3.0,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1488,
        value: 'Fuel Oil #5',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.1838,
        CO2: 72.93,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1524,
        value: 'Fuel Oil #6 (high sulfur)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.3538,
        CO2: 75.10,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .149,
        value: 'Fuel Oil #6 (low sulfur)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.3538,
        CO2: 75.10,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1387,
        value: 'Crude Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 74.7938,
        CO2: 74.54,
        CH4: 3.0,
        N2O: .6
    },
    //CHECK VALUES: Gasoline = Natural Gasoline?
    //emissionsOutputRate checks out.
    {
        startingUnit: 'gal',
        heatCapacityValue: .12760,
        value: 'Gasoline',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 67.1338,
        CO2: 66.88,
        CH4: 3,
        N2O: .6
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .1351,
        value: 'Kerosene',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.4538,
        CO2: 75.2,
        CH4: 3,
        N2O: .6
    },
    //CHECK VALUE: Gas Oil = Heavy Gas Oil?
    //emissionsOutputRate checks out.
    {
        startingUnit: 'gal',
        heatCapacityValue: .148,
        value: 'Gas Oil',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 75.1738,
        CO2: 74.92,
        CH4: 3,
        N2O: .6
    },
    //CHECK VALUE: Liquefied Natural Gas = Natural Gasoline? 
    //emissionsOutputRate checks out.
    {
        startingUnit: 'gal',
        heatCapacityValue: .086,
        value: 'Liquefied Natural Gas (LNG)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 53.1148,
        CO2: 53.06,
        CH4: 1,
        N2O: .1
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .128,
        value: 'Biodiesel (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 73.90028,
        CO2: 73.84,
        CH4: 1.1,
        N2O: .11,
        isBiofuel: true
    },
    {
        startingUnit: 'gal',
        heatCapacityValue: .084,
        value: 'Ethanol (100%)',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 68.50028,
        CO2: 68.44,
        CH4: 1.1,
        N2O: .11,
        isBiofuel: true
    }

]

export const SolidOptions: Array<FuelTypeOption> = [
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
        N2O: 4.2
    },
    {
        startingUnit: 'lb',
        heatCapacityValue: .008,
        value: 'Wood',
        siteToSourceMultiplier: 1,
        emissionsOutputRate: 95.0528,
        CO2: 93.8,
        CH4: 7.2,
        N2O: 3.6
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
        N2O: 0
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
        N2O: 0
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

export const OtherEnergyOptions: Array<FuelTypeOption> = [
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

export function getFuelTypeOptions(source: MeterSource, phase: MeterPhase, customFuels: Array<IdbCustomFuel>): Array<FuelTypeOption> {
    if (source == 'Other Fuels') {
        let sourceCustomFuels: Array<IdbCustomFuel> = customFuels.filter(cFuel => {
            return cFuel.phase == phase
        });
        let fuels: Array<FuelTypeOption> = sourceCustomFuels.map(option => {
            return option
        });
        if (phase == 'Solid') {
            SolidOptions.forEach(option => {
                fuels.push(option);
            });
            return fuels;
        } else if (phase == 'Liquid') {
            LiquidOptions.forEach(option => {
                fuels.push(option);
            });
            return fuels;
        } else if (phase == 'Gas') {
            GasOptions.forEach(option => {
                fuels.push(option);
            });
            return fuels;
        }
    } else if (source == 'Other Energy') {
        return OtherEnergyOptions;
    }
    return [];
}



export interface AgreementType {
    typeLabel: string,
    value: number
}