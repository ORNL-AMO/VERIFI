import { getRegressionModelYears } from './regression-models-calculator';

describe('regression model year range', () => {
  it.each([
    { baselineYear: 2022, reportYear: 2025, expected: [2022, 2023, 2024, 2025] },
    { baselineYear: 2025, reportYear: 2025, expected: [2025] },
    { baselineYear: 2026, reportYear: 2025, expected: [] },
    { baselineYear: Number.NaN, reportYear: 2025, expected: [] }
  ])('uses the inclusive baseline-to-report range for $baselineYear through $reportYear', ({ baselineYear, reportYear, expected }) => {
    expect(getRegressionModelYears(baselineYear, reportYear)).toEqual(expected);
  });
});
