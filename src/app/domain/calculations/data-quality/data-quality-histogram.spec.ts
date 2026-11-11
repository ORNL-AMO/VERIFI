import { buildDataQualityHistogram, isValidQualityHistogramBinCount } from './data-quality-histogram';

describe('v0-compatible Data Quality distributions', () => {
  it.each([
    { values: [1, 2, 3, 4, 5], bins: 2, size: 2, counts: [2, 2] },
    { values: [10, 10, 10, 100], bins: 50, size: 2, counts: [3] },
    { values: [10, 10, 11, 12, 100], bins: 50, size: 2, counts: [3, 1] },
    { values: [0, 1, 2, 3, 4, 5], bins: 2, size: 3, counts: [3, 3] },
    { values: [-5, -4, -3, -2, -1], bins: 2, size: 2, counts: [2, 2] },
    { values: [.1, .2, .3, .4], bins: 50, size: 1, counts: [4] },
    { values: [10, 50, 100], bins: 1, size: 100, counts: [3] }
  ])('preserves ceil-size, right-open boundaries, and tail trimming for $values with $bins bins', ({ values, bins, size, counts }) => {
    const original = [...values], result = buildDataQualityHistogram(values, bins);
    expect(result.state).toBe('ready'); expect(result.binSize).toBe(size);
    expect(result.bins.map(bin => bin.count)).toEqual(counts);
    expect(result.bins[0].lower).toBe(Math.min(...values)); expect(values).toEqual(original);
  });
  it.each([-5, 0, 12, Number.MAX_VALUE])('safely places constant %s readings in a single bin', value => {
    const result = buildDataQualityHistogram([value, value, value]);
    expect(result.state).toBe('ready'); expect(result.binSize).toBe(1);
    expect(result.bins).toHaveLength(1); expect(result.bins[0].count).toBe(3);
  });
  it('filters invalid values without coercing them and handles empty readings', () => {
    expect(buildDataQualityHistogram([null, undefined, NaN, Infinity, -Infinity, '3'])).toEqual({ state: 'empty', bins: [] });
    expect(buildDataQualityHistogram([])).toEqual({ state: 'empty', bins: [] });
    expect(buildDataQualityHistogram([1, null, 2, NaN, 3], 2).bins.map(bin => bin.count)).toEqual([1, 1]);
  });
  it.each([0, -1, 1.5, NaN, Infinity, 1001])('rejects invalid bin count %s and uses the default safely', count => {
    expect(isValidQualityHistogramBinCount(count)).toBe(false);
    expect(buildDataQualityHistogram([10, 12, 100], count)).toEqual(buildDataQualityHistogram([10, 12, 100], 50));
  });
  it('bounds work for unrepresentable and excessively large distributions', () => {
    expect(buildDataQualityHistogram([-Number.MAX_VALUE, Number.MAX_VALUE]).state).toBe('unavailable');
    expect(buildDataQualityHistogram([-1e9, 1], 1).state).toBe('unavailable');
    expect(buildDataQualityHistogram([1.6e308, 1.7e308], 1).state).toBe('unavailable');
    expect(buildDataQualityHistogram([-100, -20], 1).state).toBe('ready');
  });
});
