import type { V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';

/** Feature projections supply percentages in the same order as the row labels. */
export interface ContributionHeatmapView {
  readonly labels: readonly string[];
  readonly years: readonly {
    readonly year: number;
    readonly totalContributionPercent: number;
    readonly contributions: readonly number[];
  }[];
}

export function contributionHeatmapOption(
  view: ContributionHeatmapView,
  seriesName: string,
  compact = false
): V1EChartsOption {
  const values = view.years.flatMap((year, yearIndex) =>
    year.contributions.map((contribution, rowIndex) => [yearIndex, rowIndex, contribution])
  );
  const maxMagnitude = Math.max(1, ...values.map(value => Math.abs(value[2])));
  return {
    tooltip: { trigger: 'item', renderMode: 'richText', formatter: params => {
      const value = heatmapTuple(params);
      if (!value) return '';
      const [yearIndex, rowIndex, contribution] = value;
      return `${view.labels[rowIndex] ?? ''}\nFiscal Year ${view.years[yearIndex]?.year ?? ''}\nContribution: ${formatPercent(contribution)}`;
    } },
    legend: { show: false },
    grid: { top: compact ? 12 : 20, right: 28, bottom: compact ? 64 : 76, left: 16, containLabel: true },
    xAxis: {
      type: 'category', position: 'top',
      data: view.years.map(year => `${year.year} (${formatPercent(year.totalContributionPercent).replace(/^(-?)0\./, '$1.')})`),
      axisTick: { show: false }, splitArea: { show: true }
    },
    yAxis: {
      type: 'category', inverse: true, data: [...view.labels],
      axisTick: { show: false }, axisLabel: { width: 168, overflow: 'break', lineHeight: 15 }
    },
    visualMap: {
      type: 'continuous', min: -maxMagnitude, max: maxMagnitude, dimension: 2,
      orient: 'horizontal', left: 'center', bottom: 8, calculable: false,
      text: ['Savings', 'Loss'], formatter: value => formatPercent(Number(value)),
      inRange: { color: ['var(--v1-danger)', 'var(--v1-panel)', 'var(--v1-success)'] }
    },
    series: [{
      name: seriesName, type: 'heatmap', data: values,
      label: {
        show: true,
        formatter: params => {
          const value = heatmapTuple(params)?.[2] ?? 0;
          return `{${Math.abs(value) >= maxMagnitude * .45 ? 'inverse' : 'normal'}|${formatPercent(value)}}`;
        },
        rich: {
          inverse: { color: '#ffffff', fontWeight: 800 },
          normal: { color: 'var(--v1-text)', fontWeight: 800 }
        }
      },
      itemStyle: { borderWidth: 2, borderColor: 'var(--v1-surface)' },
      emphasis: { itemStyle: { borderWidth: 3, borderColor: 'var(--v1-text)' } }
    }]
  } as V1EChartsOption;
}

function heatmapTuple(params: unknown): [number, number, number] | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const value = (params as { value?: unknown }).value;
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const tuple = value.slice(0, 3).map(Number);
  return tuple.every(Number.isFinite) ? tuple as [number, number, number] : undefined;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}%`;
}
