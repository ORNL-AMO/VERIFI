export interface UnitOption {
    display: string,
    value: string,
    unitsOfMeasure: string
}

export const EnergyUnitOptions: Array<UnitOption> = [
    {
        display: 'Kilowatt-hour (kWh)',
        value: 'kWh',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Megawatt-hour (MWh)',
        value: 'MWh',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Kilojoules (kJ)',
        value: 'kJ',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Gigajoules (GJ)',
        value: 'GJ',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Megajoules (MJ)',
        value: 'MJ',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Therms',
        value: 'Therms',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Dekatherms (DTherms)',
        value: 'DTherms',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Million British Thermal Units (MMBtu)',
        value: 'MMBtu',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Kilocalorie (kcal)',
        value: 'kcal',
        unitsOfMeasure: 'Imperial'
    }
];


export const VolumeLiquidOptions: Array<UnitOption> = [
    {
        display: 'Feet Cubed (ft&#x00B3;)',
        value: 'ft3',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Gallon (gal)',
        value: 'gal',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Thousand Gallons (kGal)',
        value: 'kgal',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Million Gallons (Mgal)',
        value: 'Mgal',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Cubic Meters (m&#x00B3;)',
        value: 'm3',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Liters (L)',
        value: 'L',
        unitsOfMeasure: 'Metric'
    }
]

export const VolumeGasOptions: Array<UnitOption> = [
    {
        display: 'Standard Cubic Feet (SCF)',
        value: 'SCF',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Normal Meters Cubed (Nm&#x00B3;)',
        value: 'm3',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Hundred Cubic Feet (CCF)',
        value: 'CCF',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Million Cubic Feet (MMCF)',
        value: 'MMCF',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Million Cubic Meters (MCM)',
        value: 'MCM',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Thousand Standard Cubic Feet (kSCF)',
        value: 'kSCF',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Thousand Cubic Meters (kCM)',
        value: 'kCM',
        unitsOfMeasure: 'Metric'
    },
]


export const SizeUnitOptions: Array<UnitOption> = [
    {
        display: 'Feet (ft)',
        value: 'ft',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Meter (m)',
        value: 'm',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Kilometer (km)',
        value: 'km',
        unitsOfMeasure: 'Metric'
    }
]


export const MassUnitOptions: Array<UnitOption> = [
    {
        display: 'Pounds (lb)',
        value: 'lb',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Kilograms (kg)',
        value: 'kg',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Long Ton',
        value: 'ton',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Short Ton',
        value: 'shortTon',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Metric Tonnes (tonnes)',
        value: 'tonne',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Thousand pounds (klb)',
        value: 'klb',
        unitsOfMeasure: 'Imperial'
    }
]


export const ChilledWaterUnitOptions: Array<UnitOption> = [
    {
        display: 'Ton-Hour (ton-Hr)',
        value: 'tonHr',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Gallons-Fahrenheit (gal-&#x2109;)',
        value: 'galF',
        unitsOfMeasure: 'Imperial'
    },

]

export const DemandUnitOptions: Array<UnitOption> = [
    //kW kVA MW MVA
    {
        display: 'Kilowatt (kW)',
        value: 'kW',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Kilovolt-Ampere (kVA)',
        value: 'kVA',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Megawatt (MW)',
        value: 'MW',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'MegaVolt-Ampere (MVA)',
        value: 'MVA',
        unitsOfMeasure: 'Metric'
    }
]

export const PowerUnitOptions: Array<UnitOption> = [
    {
        display: 'Kilowatt (kW)',
        value: 'kW',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Watt (W)',
        value: 'W',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Megawatt (MW)',
        value: 'MW',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Horsepower (hp)',
        value: 'hp',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Kilojoules per hour (kJ/hr)',
        value: 'kJh',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Gigajoules per hour (GJ/hr)',
        value: 'GJh',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Megajoules per hour (MJ/hr)',
        value: 'MJh',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Million British Thermal Units per hour (MMBtu/hr)',
        value: 'MMBtuhr',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'British Thermal Units per hour (Btu/hr)',
        value: 'btuhr',
        unitsOfMeasure: 'Imperial'
    },
]