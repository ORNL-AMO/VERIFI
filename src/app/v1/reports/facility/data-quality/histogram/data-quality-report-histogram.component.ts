import { Component, ViewChild, computed, effect, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { DEFAULT_QUALITY_HISTOGRAM_BINS, isValidQualityHistogramBinCount,
  MAX_QUALITY_HISTOGRAM_BINS } from '@domain/calculations/data-quality/data-quality-histogram';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { dataQualityHistogramView } from './data-quality-report-histogram.view';

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

  private readonly view = computed(() =>
    dataQualityHistogramView(this.values(), this.numberOfBins(), this.metric(), this.unit()));
  readonly bins = computed(() => this.view().bins);
  readonly binSizeLabel = computed(() => this.view().binSizeLabel);
  readonly chartOption = computed(() => this.view().chartOption);
  readonly message = computed(() => this.view().message);
  downloadChart(): void { this.chart?.downloadPng(this.chartFileName()); }
}
