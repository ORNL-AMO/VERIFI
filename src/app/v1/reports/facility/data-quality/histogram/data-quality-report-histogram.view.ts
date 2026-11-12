import { buildDataQualityHistogram } from '@domain/calculations/data-quality/data-quality-histogram';
import { V1EChartsOption } from '@app/v1/shared/charts/echarts';

const histogramNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });
const scientificHistogramNumber = new Intl.NumberFormat('en-US', {
  notation: 'scientific', maximumSignificantDigits: 17
});
function formatHistogramNumber(value: number): string {
  return Math.abs(value) >= 1e12 ? scientificHistogramNumber.format(value) : histogramNumber.format(value);
}

export function dataQualityHistogramView(values: readonly unknown[], numberOfBins: number, metric: string, unit = '') {
  const histogram = buildDataQualityHistogram(values, numberOfBins);
  const bins = histogram.bins.map(bin => ({ ...bin,
    center: bin.lower + (bin.upper - bin.lower) / 2,
    label: bin.lower === bin.upper ? formatHistogramNumber(bin.lower)
      : `${formatHistogramNumber(bin.lower)} – ${formatHistogramNumber(bin.upper)}`
  }));
  const chartOption = (): V1EChartsOption | undefined => {
    if (histogram.state !== 'ready') return undefined;
    const zoom = bins.length > 20;
    const numericAxis = bins[0].upper > bins[0].lower;
    return {
      legend: { show: false },
      tooltip: { trigger: 'item', confine: true, formatter: params => {
        const index = (params as { dataIndex?: number }).dataIndex;
        const bin = index === undefined ? undefined : bins[index];
        return bin ? `<div>Range: ${bin.label}</div><div>Frequency: ${bin.count}</div>` : '';
      } },
      grid: { top: 28, left: 50, right: 24, bottom: zoom ? 110 : 65, containLabel: true },
      xAxis: { ...(numericAxis
          ? { type: 'value', min: bins[0].lower, max: bins[bins.length - 1].upper, scale: true }
          : { type: 'category', data: bins.map(bin => formatHistogramNumber(bin.lower)) }),
        name: unit ? `${metric} (${unit})` : metric, nameLocation: 'middle', nameGap: 38,
        axisLabel: { hideOverlap: true,
          formatter: value => numericAxis ? formatHistogramNumber(Number(value)) : String(value) } },
      yAxis: { type: 'value', minInterval: 1, name: 'Frequency' },
      dataZoom: [
        ...(bins.length > 1 ? [{ type: 'inside', start: 0, end: 100 }] : []),
        ...(zoom ? [{ type: 'slider', start: 0, end: 100, bottom: 10, height: 22 }] : [])
      ],
      series: [{ name: 'Frequency', type: 'bar',
        data: numericAxis ? bins.map(bin => [bin.center, bin.count]) : bins.map(bin => bin.count),
        ...(numericAxis ? { encode: { x: 0, y: 1 } } : {}), barWidth: '85%',
        itemStyle: { color: 'var(--v1-chart-series-1)', borderColor: 'var(--v1-surface)', borderWidth: 1 } }]
    } as V1EChartsOption;
  };
  return { bins, chartOption: chartOption(),
    binSizeLabel: histogram.binSize === undefined ? 'Unavailable' : formatHistogramNumber(histogram.binSize),
    message: histogram.state === 'ready' ? undefined
      : histogram.state === 'empty' ? 'No usable numeric readings are available for this distribution.'
      : 'These values cannot be displayed with this bin count. Choose a different count or review the readings.'
  };
}
