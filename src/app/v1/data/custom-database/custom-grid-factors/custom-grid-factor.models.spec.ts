import { describe, expect, it } from 'vitest';
import {
  calculateGridFactorOutputRate,
  displayGridFactorRate,
  gridFactorYearCoverage,
  gridFactorYears,
  latestGridFactorRate,
  sortedGridFactorRates
} from './custom-grid-factor.models';

describe('custom grid factor models', () => {
  const calculatedRate = (year: number, CO2: number) => ({
    year,
    CO2,
    CH4: 2,
    N2O: 1,
    co2Emissions: 999
  });

  it('calculates AR5 output rates in the existing grid-factor units', () => {
    expect(calculateGridFactorOutputRate(50, 2, 1)).toBe(50.321);
    expect(calculateGridFactorOutputRate(1.23456, 0, 0)).toBe(1.2346);
  });

  it('provides years from the current year through 1990', () => {
    expect(gridFactorYears(1992)).toEqual([1992, 1991, 1990]);
  });

  it('sorts copied rows without changing the source array', () => {
    const source = [calculatedRate(2024, 20), calculatedRate(2022, 10)];

    const sorted = sortedGridFactorRates(source);

    expect(sorted.map(rate => rate.year)).toEqual([2022, 2024]);
    expect(source.map(rate => rate.year)).toEqual([2024, 2022]);
    expect(sorted[0]).not.toBe(source[1]);
  });

  it('summarizes year coverage and uses the newest row for cards', () => {
    const rates = [calculatedRate(2021, 10), calculatedRate(2024, 20)];

    expect(gridFactorYearCoverage(rates)).toBe('2021–2024');
    expect(latestGridFactorRate(rates)?.year).toBe(2024);
    expect(displayGridFactorRate(rates[1], false)).toBe(20.321);
    expect(displayGridFactorRate(rates[1], true)).toBe(999);
  });
});
