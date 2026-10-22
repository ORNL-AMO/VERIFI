import { buildTimeSeriesDisplay, zScores } from './group-visualization-standardization';
import { correlationOption, formatRawVisualizationValue, timeSeriesOption, zScoreTooltip } from './group-visualization-charts';
import type { GroupMonthlyPoint, VisualizationPredictor } from './group-visualization.models';

describe('time-series standardization', () => {
  const predictor: VisualizationPredictor = { guid: 'p', name: 'Production', unit: 'widgets', label: 'Production (widgets)',
    style: { slot: 1, color: 'var(--v1-chart-series-2)', lineStyle: 'solid' } };
  const points: GroupMonthlyPoint[] = [0, 1, 2].map((value, index) => ({ month: 2024 * 12 + index, label: `Month ${index + 1}`,
    usage: value * 10 - 10, complete: true, predictors: { p: value * 2 + 20 }, duplicatePredictors: [] }));

  it('displays raw values with five significant figures across axes and tooltips without rounding chart data', () => {
    expect(formatRawVisualizationValue(12345.6789)).toBe((12346).toLocaleString());
    expect(formatRawVisualizationValue(1234567.89)).toBe((1234600).toLocaleString());
    expect(formatRawVisualizationValue(-123.456789)).toBe((-123.46).toLocaleString());
    expect(formatRawVisualizationValue(.0000123456789)).toBe('0.000012346');
    expect(formatRawVisualizationValue(0)).toBe('0');
    expect(formatRawVisualizationValue(null)).toBe('unavailable');
    expect(formatRawVisualizationValue(NaN)).toBe('unavailable');
    const precise = points.map(point => ({ ...point, usage: 12345.6789 }));
    const option = timeSeriesOption(precise, [predictor], 'Group usage (MMBtu)', { start: 0, end: 100 },
      buildTimeSeriesDisplay(precise, [predictor], 'raw')) as any;
    expect(option.tooltip.formatter([{ axisValueLabel: 'Jan 2024', seriesName: 'Group usage (MMBtu)', value: 12345.6789 }]))
      .toBe(`Jan 2024\nGroup usage (MMBtu): ${(12346).toLocaleString()}`);
    expect(option.yAxis[0].axisLabel.formatter(12345.6789)).toBe((12346).toLocaleString());
    expect(option.yAxis[1].axisLabel.formatter(12345.6789)).toBe((12346).toLocaleString());
    expect(option.series[0].data[0]).toBe(12345.6789);
    const scatter = correlationOption(predictor, { pairs: [{ x: .0000123456789, y: 12345.6789, label: 'Jan 2024' }] }, 'Group usage (MMBtu)') as any;
    expect(scatter.tooltip.formatter({ value: [.0000123456789, 12345.6789, 'Jan 2024'] }))
      .toContain(`Production (widgets): 0.000012346\nGroup usage (MMBtu): ${(12346).toLocaleString()}`);
    expect(scatter.series[0].data[0]).toEqual([.0000123456789, 12345.6789, 'Jan 2024']);
  });

  it('uses population standard deviation and independently aligns positively correlated series', () => {
    const display = buildTimeSeriesDisplay(points, [predictor], 'z-score');
    expect(display.unavailableSeries).toEqual([]);
    for (const values of [display.groupValues, display.predictorValues.p]) {
      expect(values[0]).toBeCloseTo(-Math.sqrt(1.5));
      expect(values[1]).toBeCloseTo(0);
      expect(values[2]).toBeCloseTo(Math.sqrt(1.5));
      expect(values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0);
      expect(values.reduce((sum, value) => sum + value * value, 0) / values.length).toBeCloseTo(1);
    }
    expect(points[0].usage).toBe(-10);
    const negative = zScores([10, 0, -10]);
    expect(negative.values[0]).toBeCloseTo(Math.sqrt(1.5));
    expect(negative.values[2]).toBeCloseTo(-Math.sqrt(1.5));
  });

  it('preserves gaps and real zeroes and handles large or tiny magnitudes without overflow', () => {
    const result = zScores([-1, null, 0, NaN, 1, Infinity]);
    expect(result.available).toBe(true);
    expect(result.values[1]).toBeNull();
    expect(result.values[2]).toBeCloseTo(0);
    expect(result.values[3]).toBeNull();
    expect(result.values[5]).toBeNull();
    for (const magnitude of [1e308, 1e-300]) {
      const scaled = zScores([-magnitude, 0, magnitude]);
      expect(scaled.available).toBe(true);
      expect(scaled.values[0]).toBeCloseTo(-Math.sqrt(1.5));
      expect(scaled.values[2]).toBeCloseTo(Math.sqrt(1.5));
    }
  });

  it('returns gaps for constant, insufficient and missing series with an identifiable notice', () => {
    for (const values of [[], [null, NaN], [1], [0, 0, 0], [5, 5, 5]]) {
      expect(zScores(values)).toEqual({ available: false, values: values.map(() => null) });
    }
    const constant = points.map(point => ({ ...point, predictors: { p: 7 } }));
    const display = buildTimeSeriesDisplay(constant, [predictor], 'z-score');
    expect(display.unavailableSeries).toEqual(['Production']);
    expect(display.predictorValues.p).toEqual([null, null, null]);
  });

  it('shows only the selected value type in tooltips, using two raw axes or one z-score axis', () => {
    const raw = buildTimeSeriesDisplay(points, [predictor], 'raw');
    const standardized = buildTimeSeriesDisplay(points, [predictor], 'z-score');
    expect(raw.groupValues).toEqual([-10, 0, 10]);
    expect(raw.predictorValues.p).toEqual([20, 22, 24]);
    const rawOption = timeSeriesOption(points, [predictor], 'Group usage (MMBtu)', { start: 0, end: 100 }, raw) as any;
    const zOption = timeSeriesOption(points, [predictor], 'Group usage (MMBtu)', { start: 20, end: 80 }, standardized) as any;
    expect(rawOption.yAxis).toHaveLength(2);
    expect(rawOption.series.map((series: any) => series.yAxisIndex)).toEqual([0, 1]);
    expect(zOption.yAxis).toHaveLength(1);
    expect(zOption.yAxis[0].name).toBe('Standard deviations from mean');
    expect(zOption.xAxis.axisLine).toMatchObject({ onZero: true, onZeroAxisIndex: 0,
      lineStyle: { width: 2, color: 'var(--v1-chart-annotation)' } });
    expect(zOption.series.every((series: any) => series.yAxisIndex === 0)).toBe(true);
    expect(zOption.series[1].data[0]).toEqual(standardized.predictorValues.p[0]);
    expect(rawOption.series.map((series: any) => series.name)).toEqual(['Group usage (MMBtu)', 'Production (widgets)']);
    expect(zOption.series.map((series: any) => series.name)).toEqual(['Group usage', 'Production']);
    expect(zOption.series.map((series: any) => series.itemStyle)).toEqual(rawOption.series.map((series: any) => series.itemStyle));
    expect(zOption.dataZoom[0]).toMatchObject({ start: 20, end: 80 });
    const full = timeSeriesOption(points, [predictor], 'Group usage (MMBtu)', { start: 0, end: 100 }, standardized) as any;
    expect(zOption.series).toEqual(full.series);
    const text = zScoreTooltip([{ axisValueLabel: 'Jan 2024', seriesName: predictor.name, value: 1.234567 }]);
    expect(text).toBe('Jan 2024\nProduction: z = 1.23457');
    expect(zScoreTooltip([{ seriesName: 'Missing', value: null }])).toContain('unavailable');
  });
});
