import { MeterSource } from "src/app/models/constantsAndTypes";

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

export type ChargeCostUnit = 'dollarsPerKilowatt' | 'dollarsPerKVa' | 'dollarsPerMW' | 'dollarsPerMVA' | 'percent' | 'dollars' | 'dollarsPerKilowattHour' |
    'dollarsPerMWh' | 'dollarsPerMMBtu' | 'dollarsPerGJ' | 'dollarsPerMJ' | 'dollarsPerkJ' | 'dollarsPerTherms' | 'dollarsPerDTherms' | 'dollarsPerKcal';

export function getChargeTypes(meterSource: MeterSource): Array<{ value: MeterChargeType, label: string, sourceType: Array<MeterSource> }> {
    return ChargesTypes.filter(chargeType => {
        return chargeType.sourceType.includes(meterSource);
    });
}

export const ChargesTypes: Array<{ value: MeterChargeType, label: string, sourceType: Array<MeterSource> }> = [
    //Consmption
    { label: 'Consumption', value: 'consumption', sourceType: ['Electricity'] },
    //Demand
    { label: 'Demand', value: 'demand', sourceType: ['Electricity'] },
    //Tax
    { label: 'Tax', value: 'tax', sourceType: ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy'] },
    //Late Fee
    { label: 'Late Fee', value: 'lateFee', sourceType: ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy'] },
    //Flat Fee
    { label: 'Flat Fee', value: 'flatFee', sourceType: ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy'] },
    //Other
    { label: 'Other', value: 'other', sourceType: ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy'] },
    //Demand/MDQ
    { label: 'Demand/MDQ', value: 'demandMDQ', sourceType: ['Natural Gas', 'Other Fuels'] },
    //Demand/MDQ
    { label: 'Usage', value: 'usage', sourceType: ['Natural Gas', 'Other Fuels', 'Other Energy'] }
]

export type MeterChargeType = 'consumption' | 'demand' | 'tax' | 'lateFee' | 'flatFee' | 'other' | 'demandMDQ' | 'usage';