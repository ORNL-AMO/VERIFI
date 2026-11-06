import { ConvertValue } from '@domain/calculations/conversions/convertValue';

export function calculateOperatingHours(hours: number | null, days: number | null, weeks: number | null): number | null {
  if (hours == null || days == null || weeks == null || ![hours, days, weeks].every(Number.isFinite)
    || hours < 0 || hours > 24 || days < 0 || days > 7 || weeks < 0 || weeks > 52) return null;
  return Math.ceil(hours * days * weeks);
}
export interface LoadFactorInputs {
  method: 'voltageCurrent' | 'measuredPower'; ratedPower: number | null; ratedPowerUnit: string;
  measuredPower: number | null; measuredPowerUnit: string; voltage: number | null; current: number | null;
  phases: number; powerFactor: number | null;
}
export function calculateLoadFactor(value: LoadFactorInputs): { percent: number; applied: number } | null {
  const convert = (amount: number | null, unit: string) => {
    if (amount == null || !Number.isFinite(amount)) return NaN;
    const result = new ConvertValue(amount, unit, 'kW');
    return result.hasError ? NaN : result.convertedValue;
  };
  const rated = convert(value.ratedPower, value.ratedPowerUnit);
  let actual = convert(value.measuredPower, value.measuredPowerUnit);
  if (value.method === 'voltageCurrent') {
    const { voltage, current, phases, powerFactor } = value;
    if (voltage == null || current == null || powerFactor == null || ![voltage, current, phases, powerFactor].every(Number.isFinite)
      || voltage < 0 || current < 0 || !Number.isInteger(phases) || phases < 1 || phases > 3 || powerFactor < 0 || powerFactor > 1) return null;
    actual = voltage * current * Math.sqrt(phases) * powerFactor / 1000;
  }
  if (!Number.isFinite(rated) || rated <= 0 || !Number.isFinite(actual) || actual < 0) return null;
  const percent = actual / rated * 100;
  return Number.isFinite(percent) ? { percent, applied: Math.round(Math.min(percent, 115) * 10) / 10 } : null;
}
