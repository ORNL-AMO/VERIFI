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
        display: 'Joules (J)',
        value: 'J',
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
        display: 'British Thermal Units (Btu)',
        value: 'Btu',
        unitsOfMeasure: 'Metric'
    },
    {
        display: 'Million British Thermal Units (MMBtu)',
        value: 'MMBtu',
        unitsOfMeasure: 'Metric'
    }
];


export const VolumeUnitOptions: Array<UnitOption> = [
    {
        display: 'Standard Cubic Feet (SCF)',
        value: 'ft3',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Thousand Standard Cubic Feet (kSCF)',
        value: 'kSCF',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Gallon (gal)',
        value: 'gal',
        unitsOfMeasure: 'Imperial'
    },
    {
        display: 'Thousand U.S. Gallos (kgal)',
        value: 'kgal',
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
        display: 'Tons',
        value: 'ton',
        unitsOfMeasure: 'Imperial'
    }
]