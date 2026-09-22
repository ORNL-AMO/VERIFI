import { EmissionsRate } from '@data/models/eGridEmissions';

export const GRID_FACTOR_FIRST_YEAR = 1990;

export function gridFactorYears(currentYear = new Date().getFullYear()): readonly number[] {
  return Array.from({ length: currentYear - GRID_FACTOR_FIRST_YEAR + 1 }, (_, index) => currentYear - index);
}

export function calculateGridFactorOutputRate(CO2: number, CH4: number, N2O: number): number {
  const result = CO2 + (CH4 * 28 / 1000) + (N2O * 265 / 1000);
  return Math.round(result * 10_000) / 10_000;
}

export function sortedGridFactorRates<T extends EmissionsRate>(rates: readonly T[]): T[] {
  return [...rates]
    .map(rate => ({ ...rate }))
    .sort((first, second) => first.year - second.year);
}

export function latestGridFactorRate(rates: readonly EmissionsRate[]): EmissionsRate | undefined {
  return [...rates].sort((first, second) => second.year - first.year)[0];
}

export function gridFactorYearCoverage(rates: readonly EmissionsRate[]): string {
  const years = rates.map(rate => rate.year).filter(Number.isFinite).sort((first, second) => first - second);
  if (years.length === 0) return 'No years';
  if (years[0] === years[years.length - 1]) return String(years[0]);
  return `${years[0]}–${years[years.length - 1]}`;
}

export function displayGridFactorRate(rate: EmissionsRate | undefined, direct: boolean): number | undefined {
  if (!rate) return undefined;
  if (direct) return rate.co2Emissions;
  if (![rate.CO2, rate.CH4, rate.N2O].every(Number.isFinite)) return undefined;
  return calculateGridFactorOutputRate(rate.CO2, rate.CH4, rate.N2O);
}
