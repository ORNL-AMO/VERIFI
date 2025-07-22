
export const ConsumptionCostUnits: Array<{ value: ChargeCostUnit, label: string }> = [
    { value: 'dollarsPerKilowattHour', label: '$/kWh' },
    { value: 'dollarsPerMWh', label: '$/MWh' },
    { value: 'dollarsPerMMBtu', label: '$/MMBtu' },
    { value: 'dollarsPerGJ', label: '$/GJ' },
    { value: 'dollarsPerMJ', label: '$/MJ' },
    { value: 'dollarsPerkJ', label: '$/kJ' },
    { value: 'dollarsPerTherms', label: '$/Therms' },
    { value: 'dollarsPerDTherms', label: '$/DTherms' },
    { value: 'dollarsPerKcal', label: '$/Kcal' }
]

export const DemandCostUnits: Array<{ value: ChargeCostUnit, label: string }> = [
    { value: 'dollarsPerKilowatt', label: '$/kW' },
    { value: 'dollarsPerKVa', label: '$/kVA' },
    { value: 'dollarsPerMW', label: '$/MW' },
    { value: 'dollarsPerMVA', label: '$/MVA' },
]

export const OtherCostUnits: Array<{ value: ChargeCostUnit, label: string }> = [
    { value: 'percent', label: '%' },
    { value: 'dollars', label: '$' },
]

export type ChargeCostUnit = 'dollarsPerKilowatt' | 'dollarsPerKVa' | 'dollarsPerMW' | 'dollarsPerMVA' | 'percent' | 'dollars' | 'dollarsPerKilowattHour' | 'dollarsPerMWh' | 'dollarsPerMMBtu' | 'dollarsPerGJ' | 'dollarsPerMJ' | 'dollarsPerkJ' | 'dollarsPerTherms' | 'dollarsPerDTherms' | 'dollarsPerKcal';


export const ChargesTypes: Array<{ value: MeterChargeType, label: string }> = [
    //Consmption
    { label: 'Consumption', value: 'consumption' },
    //Demand
    { label: 'Demand', value: 'demand' },
    //Tax
    { label: 'Tax', value: 'tax' },
    //Late Fee
    { label: 'Late Fee', value: 'lateFee' },
    //Flat Fee
    { label: 'Flat Fee', value: 'flatFee' },
    //Other
    { label: 'Other', value: 'other' }
]

export type MeterChargeType = 'consumption' | 'demand' | 'tax' | 'lateFee' | 'flatFee' | 'other';