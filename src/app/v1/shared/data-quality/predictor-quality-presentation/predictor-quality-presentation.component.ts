import { Component, DestroyRef, ElementRef, ViewChild, computed, inject, input, signal } from '@angular/core';
import { PredictorDataQualityReport } from '@domain/calculations/data-quality/predictor-data-quality';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import {
  predictorQualityStatistics, predictorQualityChartOption, predictorQualityChartRows
} from './predictor-quality-presentation.view';

@Component({
  selector: 'app-predictor-quality-presentation', standalone: false,
  host: { '[class.report-statistics]': 'reportStatistics()' },
  templateUrl: './predictor-quality-presentation.component.html',
  styleUrls: ['./predictor-quality-presentation.component.css']
})
export class PredictorQualityPresentationComponent {
  readonly report = input.required<PredictorDataQualityReport>();
  readonly idPrefix = input.required<string>();
  readonly headingLevel = input(2);
  readonly showStatistics = input(true);
  readonly showChart = input(true);
  readonly showExpectedRangeLabel = input(true);
  readonly reportStatistics = input(false);
  readonly chartHeading = input('Readings over time');
  readonly chartFileName = input('predictor-data-quality-readings');
  private readonly copyTableService = inject(CopyTableService);
  private copyTimer?: ReturnType<typeof setTimeout>;
  readonly copyingStatisticsTable = signal(false);
  @ViewChild('statisticsTable') statisticsTable?: ElementRef<HTMLTableElement>;
  @ViewChild('qualityChart', { read: EChartsChartDirective }) qualityChart?: EChartsChartDirective;
  constructor() { inject(DestroyRef).onDestroy(() => { if (this.copyTimer) clearTimeout(this.copyTimer); }); }
  readonly statisticCells = computed(() => predictorQualityStatistics(this.report(), this.reportStatistics()));
  readonly qualityChartOption = computed(() => this.showChart()
    ? predictorQualityChartOption(this.report(), this.showExpectedRangeLabel()) : undefined);
  readonly accessibleChartRows = computed(() => predictorQualityChartRows(this.report()));

  copyStatisticsTable(): void {
    if (!this.statisticsTable || this.copyTimer) return;
    this.copyingStatisticsTable.set(true);
    const table = this.statisticsTable;
    this.copyTimer = setTimeout(() => {
      this.copyTimer = undefined;
      try { this.copyTableService.copyTable(table); }
      finally { this.copyingStatisticsTable.set(false); }
    }, 200);
  }
  downloadQualityChart(): void { this.qualityChart?.downloadPng(this.chartFileName()); }
}
