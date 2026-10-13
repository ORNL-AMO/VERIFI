import { ContributionHeatmapView, contributionHeatmapOption } from './contribution-heatmap.view';

describe('contribution heatmap presentation', () => {
  const view: ContributionHeatmapView = {
    labels: ['North', 'South'],
    years: [
      { year: 2024, totalContributionPercent: .75, contributions: [1.25, -.5] },
      { year: 2025, totalContributionPercent: -2, contributions: [-3, 1] }
    ]
  };

  it('aligns fiscal years and row labels with a symmetric loss-to-savings scale', () => {
    const option = contributionHeatmapOption(view, 'Facility contribution') as Record<string, any>;
    expect(option.xAxis.data).toEqual(['2024 (.75%)', '2025 (-2%)']);
    expect(option.yAxis.data).toEqual(['North', 'South']);
    expect(option.series[0]).toMatchObject({ name: 'Facility contribution', type: 'heatmap', data: [
      [0, 0, 1.25], [0, 1, -.5], [1, 0, -3], [1, 1, 1]
    ] });
    expect(option.visualMap).toMatchObject({ min: -3, max: 3, dimension: 2,
      inRange: { color: ['var(--v1-danger)', 'var(--v1-panel)', 'var(--v1-success)'] } });
  });

  it('formats the same contribution values in tooltips and contrast-aware cell labels', () => {
    const option = contributionHeatmapOption(view, 'Group contribution') as Record<string, any>;
    expect(option.tooltip.formatter({ value: [1, 0, -3] })).toBe('North\nFiscal Year 2025\nContribution: -3%');
    expect(option.series[0].label.formatter({ value: [1, 0, -3] })).toBe('{inverse|-3%}');
    expect(option.series[0].label.formatter({ value: [0, 1, -.5] })).toBe('{normal|-0.5%}');
    expect(option.tooltip.formatter({ value: [0, 0, NaN] })).toBe('');
    expect(option.tooltip.formatter(undefined)).toBe('');
  });

  it('retains a usable diverging scale for zero contributions', () => {
    const option = contributionHeatmapOption({ labels: ['North'], years: [
      { year: 2024, totalContributionPercent: 0, contributions: [0] }
    ] }, 'Facility contribution') as Record<string, any>;
    expect(option.visualMap).toMatchObject({ min: -1, max: 1 });
    expect(option.series[0].label.formatter({ value: [0, 0, 0] })).toBe('{normal|0%}');
  });
});
