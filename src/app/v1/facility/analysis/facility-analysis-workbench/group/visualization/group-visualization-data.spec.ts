import { baselineStartMonth, buildGroupMonthlyPoints, defaultVisualizationRange, filterVisualizationPoints,
  monthInput, monthValue, parseMonth, summarizeCorrelation, validVisualizationRange } from './group-visualization-data';
import { visualizationFixture } from './group-visualization.testing';
import type { GroupMonthlyPoint } from './group-visualization.models';

describe('group visualization monthly data', () => {
  it('defaults to baseline fiscal start through the latest group month independently of analysis method', () => {
    for (const type of ['regression', 'absoluteEnergyConsumption', 'energyIntensity', 'modifiedEnergyIntensity', 'skip', 'skipAnalysis'] as const) {
      const fixture = visualizationFixture(type);
      const points = buildGroupMonthlyPoints(fixture.meters, fixture.readings, new Set(['predictor-a']), 'energy');
      const facility = fixture.context.workbench.facility();
      expect(defaultVisualizationRange(points, baselineStartMonth(2024, facility))).toEqual({ start: '2024-01', end: '2024-06' });
      expect(baselineStartMonth(2024, { ...facility, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true })).toBe(monthValue(2023, 6));
      expect(baselineStartMonth(2024, { ...facility, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: false })).toBe(monthValue(2024, 6));
      expect(defaultVisualizationRange(points)).toEqual({ start: '2023-01', end: '2024-06' });
      expect(baselineStartMonth(undefined, facility)).toBeUndefined();
    }
  });

  it('aligns one-based predictor months, sums group meters and duplicate readings, and preserves zeroes and negatives', () => {
    const fixture = visualizationFixture();
    const meters = [fixture.meters[0], { ...fixture.meters[0], meter: { ...fixture.meters[0].meter, guid: 'meter-b' } }];
    const readings = [...fixture.readings, { ...fixture.readings[1], amount: -1 }];
    const points = buildGroupMonthlyPoints(meters, readings, new Set(['predictor-a']), 'energy');
    expect(points[0]).toMatchObject({ usage: 0, complete: true, predictors: { 'predictor-a': 0 } });
    expect(points[1]).toMatchObject({ usage: 20, predictors: { 'predictor-a': 1 }, duplicatePredictors: ['predictor-a'] });
    expect(buildGroupMonthlyPoints(meters, readings, new Set(), 'water')[1].usage).toBe(4);
    const negative = buildGroupMonthlyPoints([{ ...fixture.meters[0], monthlyData: [{ ...fixture.rows[0], energyUse: -3 }] }],
      [{ ...fixture.readings[0], amount: -4 }], new Set(['predictor-a']), 'energy');
    expect(negative[0]).toMatchObject({ usage: -3, predictors: { 'predictor-a': -4 } });
    expect(fixture.rows[1].energyUse).toBe(10);
  });

  it('keeps interior gaps and partial totals, and omits nonfinite/absent values instead of inventing zeroes', () => {
    const fixture = visualizationFixture();
    const meters = [{ ...fixture.meters[0], monthlyData: [fixture.rows[0], { ...fixture.rows[2], energyUse: NaN }] },
      { ...fixture.meters[0], meter: { ...fixture.meters[0].meter, guid: 'meter-b' }, monthlyData: [fixture.rows[0]] }];
    const points = buildGroupMonthlyPoints(meters, [{ ...fixture.readings[0], amount: Infinity }], new Set(['predictor-a']), 'energy');
    expect(points).toHaveLength(3);
    expect(points[0]).toMatchObject({ usage: 0, complete: true, predictors: { 'predictor-a': null } });
    expect(points[1]).toMatchObject({ usage: null, complete: false, predictors: { 'predictor-a': null } });
    expect(points[2]).toMatchObject({ usage: null, complete: false });
    const partial = buildGroupMonthlyPoints([{ ...meters[0], monthlyData: [fixture.rows[0], fixture.rows[2]] }, meters[1]], [], new Set(), 'energy');
    expect(partial[2]).toMatchObject({ usage: 20, complete: false });
    const retired = { ...meters[1], meter: { ...meters[1].meter, noLongerInUse: true, noLongerInUseYear: 2023, noLongerInUseMonth: 0 } };
    expect(buildGroupMonthlyPoints([{ ...meters[0], monthlyData: [fixture.rows[0], fixture.rows[2]] }, retired], [], new Set(), 'energy')[2].complete).toBe(true);
  });

  it('validates month inputs and includes both range endpoints', () => {
    const fixture = visualizationFixture();
    const points = buildGroupMonthlyPoints(fixture.meters, fixture.readings, new Set(), 'energy');
    expect(filterVisualizationPoints(points, { start: '2023-12', end: '2024-01' }).map(point => monthInput(point.month))).toEqual(['2023-12', '2024-01']);
    for (const value of ['', '2023-13', '2023-00', '0000-01', '2023-1']) expect(parseMonth(value)).toBeUndefined();
    expect(validVisualizationRange({ start: '2024-03', end: '2024-01' })).toBe(false);
    expect(filterVisualizationPoints(points, { start: '', end: '' })).toEqual([]);
    expect(buildGroupMonthlyPoints([], fixture.readings, new Set(['predictor-a']), 'energy')).toEqual([]);
  });
});

describe('exploratory correlation', () => {
  function point(x: number | null, y: number | null, complete = true): GroupMonthlyPoint {
    return { month: 0, label: 'Jan 2024', usage: y, complete, predictors: { p: x }, duplicatePredictors: [] };
  }

  it('calculates Pearson r and an intercept-bearing OLS fit at full precision', () => {
    const positive = summarizeCorrelation([point(-1, 1), point(0, 3), point(2, 7)], 'p');
    expect(positive).toMatchObject({ slope: 2, intercept: 3 });
    expect(positive.r).toBeCloseTo(1);
    expect(positive.rSquared).toBeCloseTo(1);
    const negative = summarizeCorrelation([point(0, 6), point(1, 4), point(3, 0)], 'p');
    expect(negative.r).toBeCloseTo(-1);
    expect(negative.rSquared).toBeCloseTo(1);
    expect(negative.slope).toBeCloseTo(-2);
    expect(negative.intercept).toBeCloseTo(6);
    const known = summarizeCorrelation([point(1, 2), point(2, 3), point(3, 5)], 'p');
    expect(known.slope).toBeCloseTo(1.5);
    expect(known.intercept).toBeCloseTo(1 / 3);
    expect(known.rSquared).toBeCloseTo(27 / 28);
  });

  it('excludes incomplete, missing and nonfinite pairs, and explains degenerate samples', () => {
    const result = summarizeCorrelation([point(0, 0), point(1, 1), point(null, 2), point(3, null), point(4, 4, false), point(Infinity, 5)], 'p');
    expect(result.pairs).toHaveLength(2);
    expect(result.r).toBeUndefined();
    expect(result.unavailableReason).toContain('three');
    for (const points of [[point(1, 1), point(1, 2), point(1, 3)], [point(1, 1), point(2, 1), point(3, 1)]]) {
      const summary = summarizeCorrelation(points, 'p');
      expect(summary.unavailableReason).toContain('vary');
      expect(summary.slope).toBeUndefined();
    }
  });
});
