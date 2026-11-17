import { correlationStatistics } from './exploratory-statistics';
import { zScores } from './exploratory-standardization';

describe('shared exploratory statistics', () => {
  it.each([{ y: [1, 2, 3], r: 1 }, { y: [3, 2, 1], r: -1 }, { y: [1, -2, 1], r: 0 }])('distinguishes signed r from R² for $y', ({ y, r }) => {
    const summary = correlationStatistics(y.map((value, index) => ({ x: index - 1, y: value })));
    expect(summary.r).toBeCloseTo(r); expect(summary.rSquared).toBeCloseTo(r * r);
  });
  it('rejects constant, insufficient and unsupported numerical ranges', () => {
    expect(correlationStatistics([{ x: 1, y: 2 }]).unavailableReason).toContain('three');
    expect(correlationStatistics([1, 2, 3].map(y => ({ x: 1, y }))).unavailableReason).toContain('vary');
    expect(correlationStatistics([1, 2, 3].map(x => ({ x: x * 1e308, y: x }))).unavailableReason).toContain('range');
  });
  it('standardizes finite samples without converting gaps, constants or nonfinite values into zero', () => {
    expect(zScores([null, 5, 5]).values).toEqual([null, null, null]);
    const standardized = zScores([0, 1, 2, null, NaN]);
    expect(standardized.available).toBe(true);
    expect(standardized.values[1]).toBe(0); expect(standardized.values.slice(3)).toEqual([null, null]);
    expect(zScores([1e300, 2e300, 3e300]).values).toEqual(zScores([1, 2, 3]).values);
  });
});
