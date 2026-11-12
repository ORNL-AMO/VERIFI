import { Component, DestroyRef, ElementRef, ViewChild, computed, inject, input, signal } from '@angular/core';
import { MeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import {
  METER_QUALITY_STATISTIC_COLUMNS, meterQualityStatisticRows, meterQualityChartAvailability, meterQualityChartOption
} from './meter-quality-presentation.view';

@Component({ selector: 'app-meter-quality-presentation', standalone: false,
  host: { '[class.report-statistics]': 'reportStatistics()' },
  templateUrl: './meter-quality-presentation.component.html', styleUrls: ['./meter-quality-presentation.component.css'] })
export class MeterQualityPresentationComponent {
  readonly report = input.required<MeterDataQualityReport>();
  readonly idPrefix = input.required<string>();
  readonly headingLevel = input(2);
  readonly chartFileName = input('meter-data-quality-readings');
  readonly chartHeading = input('Readings Over Time');
  readonly showExpectedRangeLabel = input(true);
  readonly showStatistics = input(true);
  readonly showConsumptionChart = input(true);
  readonly showCostChart = input(true);
  readonly reportStatistics = input(false);
  /** Facility reports retain v0 time-series visibility independently of the statistics row. */
  readonly includeExcludedConsumption = input(false);
  private readonly copyTableService = inject(CopyTableService);
  private copyTimer?: ReturnType<typeof setTimeout>;
  readonly copyingStatisticsTable = signal(false);
  readonly statisticTableColspan = METER_QUALITY_STATISTIC_COLUMNS.length + 1;
  @ViewChild('statisticsTable') statisticsTable?: ElementRef<HTMLTableElement>;
  @ViewChild('qualityChart', { read: EChartsChartDirective }) qualityChart?: EChartsChartDirective;
  constructor() { inject(DestroyRef).onDestroy(() => { if (this.copyTimer) clearTimeout(this.copyTimer); }); }
  readonly statisticRows = computed(() => meterQualityStatisticRows(this.report(), this.reportStatistics()));
  private readonly chartOptions = computed(() => ({
    consumption: this.showConsumptionChart(), cost: this.showCostChart(),
    includeExcludedConsumption: this.includeExcludedConsumption(), showExpectedRangeLabel: this.showExpectedRangeLabel()
  }));
  private readonly chartAvailability = computed(() => meterQualityChartAvailability(this.report(), this.chartOptions()));
  readonly hasConsumptionChartData = computed(() => this.chartAvailability().consumption);
  readonly hasCostChartData = computed(() => this.chartAvailability().cost);
  readonly qualityChartOption = computed(() => meterQualityChartOption(this.report(), this.chartOptions()));

  copyStatisticsTable(): void {
    if (!this.statisticsTable || this.copyTimer) {
      return;
    }
    this.copyingStatisticsTable.set(true);
    const table = this.statisticsTable;
    this.copyTimer = setTimeout(() => {
      this.copyTimer = undefined;
      try { this.copyTableService.copyTable(table); }
      finally { this.copyingStatisticsTable.set(false); }
    }, 200);
  }

  downloadQualityChart(): void {
    this.qualityChart?.downloadPng(this.chartFileName());
  }
}
