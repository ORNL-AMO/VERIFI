import { Component, ViewChild, computed, effect, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { buildDataQualityHistogram, DEFAULT_QUALITY_HISTOGRAM_BINS, isValidQualityHistogramBinCount,
  MAX_QUALITY_HISTOGRAM_BINS } from '@domain/calculations/data-quality/data-quality-histogram';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';

const histogramNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });
const scientificHistogramNumber = new Intl.NumberFormat('en-US', { notation: 'scientific', maximumSignificantDigits: 17 });
function formatHistogramNumber(value: number): string {
  return Math.abs(value) >= 1e12 ? scientificHistogramNumber.format(value) : histogramNumber.format(value);
}

@Component({
  selector: 'app-data-quality-report-histogram', standalone: false,
  templateUrl: './data-quality-report-histogram.component.html',
  styleUrls: ['./data-quality-report-histogram.component.css']
})
export class DataQualityReportHistogramComponent {
  readonly values = input.required<readonly unknown[]>();
  readonly idPrefix = input.required<string>();
  readonly heading = input.required<string>();
  readonly metric = input.required<string>();
  readonly unit = input('');
  readonly chartFileName = input('data-quality-distribution');
  readonly numberOfBins = input(DEFAULT_QUALITY_HISTOGRAM_BINS);
  readonly numberOfBinsChange = output<number>();
  readonly maxBins = MAX_QUALITY_HISTOGRAM_BINS;
  readonly binCount = new FormControl<number | null>(DEFAULT_QUALITY_HISTOGRAM_BINS,
    control => isValidQualityHistogramBinCount(control.value) ? null : { binCount: true });
  @ViewChild('chart', { read: EChartsChartDirective }) private chart?: EChartsChartDirective;

  constructor() {
    effect(() => this.binCount.setValue(this.numberOfBins(), { emitEvent: false }));
    this.binCount.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => {
      if (this.binCount.valid && isValidQualityHistogramBinCount(value) && value !== this.numberOfBins()) {
        this.numberOfBinsChange.emit(value);
      }
    });
  }

  readonly histogram = computed(() => buildDataQualityHistogram(this.values(), this.numberOfBins()));
  readonly binSizeLabel = computed(() => {
    const size = this.histogram().binSize;
    return size === undefined ? 'Unavailable' : formatHistogramNumber(size);
  });
  readonly bins = computed(() => this.histogram().bins.map(bin => ({ ...bin,
    center: bin.lower + (bin.upper - bin.lower) / 2,
    label: bin.lower === bin.upper ? formatHistogramNumber(bin.lower)
      : `${formatHistogramNumber(bin.lower)} – ${formatHistogramNumber(bin.upper)}`
  })));
  readonly chartOption = computed<V1EChartsOption | undefined>(() => {
    if (this.histogram().state !== 'ready') return undefined;
    const bins = this.bins(), zoom = bins.length > 20;
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
        name: this.unit() ? `${this.metric()} (${this.unit()})` : this.metric(), nameLocation: 'middle', nameGap: 38,
        axisLabel: { hideOverlap: true, formatter: value => numericAxis ? formatHistogramNumber(Number(value)) : String(value) } },
      yAxis: { type: 'value', minInterval: 1, name: 'Frequency' },
      dataZoom: [
        ...(bins.length > 1 ? [{ type: 'inside', start: 0, end: 100 }] : []),
        ...(zoom ? [{ type: 'slider', start: 0, end: 100, bottom: 10, height: 22 }] : [])
      ],
      series: [{ name: 'Frequency', type: 'bar', data: numericAxis ? bins.map(bin => [bin.center, bin.count]) : bins.map(bin => bin.count),
        ...(numericAxis ? { encode: { x: 0, y: 1 } } : {}), barWidth: '85%',
        itemStyle: { color: 'var(--v1-chart-series-1)', borderColor: 'var(--v1-surface)', borderWidth: 1 } }]
    } as V1EChartsOption;
  });
  downloadChart(): void { this.chart?.downloadPng(this.chartFileName()); }
}
