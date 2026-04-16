import { Component, computed, ElementRef, inject, Input, OnChanges, signal, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { EnergyUsesFacilitySummary } from 'src/app/calculations/energy-footprint/energyUsesFacilitySummary';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-energy-uses-summary-chart',
  standalone: false,
  templateUrl: './facility-energy-uses-summary-chart.component.html',
  styleUrl: './facility-energy-uses-summary-chart.component.css',
})
export class FacilityEnergyUsesSummaryChartComponent implements OnChanges {

  @Input({ required: true })
  set energyUsesFacilitySummary(value: EnergyUsesFacilitySummary) {
    this.energyUsesFacilitySummary$.set(value);
  }
  get energyUsesFacilitySummary(): EnergyUsesFacilitySummary {
    return this.energyUsesFacilitySummary$();
  }

  @Input({ required: true })
  facility: IdbFacility;

  @Input({ required: true })
  set displayHistory(value: boolean) {
    this.displayHistory$.set(value);
  }
  get displayHistory(): boolean {
    return this.displayHistory$();
  }

  private energyUsesFacilitySummary$ = signal<EnergyUsesFacilitySummary | null>(null);
  private displayHistory$ = signal<boolean>(false);

  private plotlyService = inject(PlotlyService);

  @ViewChild('summaryChart', { static: false }) summaryChart: ElementRef;

  // ---------------------------------------------------------------------------
  // Reactive chart data — recomputed whenever any signal dependency changes
  // ---------------------------------------------------------------------------

  /**
   * Derives Plotly-ready data and layout from the current inputs.
   * When displayHistory is false: treemap showing each group's share of the
   * latest year's total energy use.
   * When displayHistory is true: stacked area chart showing all years.
   */
  private chartConfig = computed(() => {
    const summary = this.energyUsesFacilitySummary$();
    const showHistory = this.displayHistory$();
    if (!summary || !this.facility) return null;
    return showHistory
      ? this.buildHistoryChartConfig(summary)
      : this.buildTreemapChartConfig(summary);
  });

  // ---------------------------------------------------------------------------
  // Angular lifecycle hooks
  // ---------------------------------------------------------------------------

  ngAfterViewInit(): void {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Redraw when any input changes after the view has been initialized.
    // (The first render is handled by ngAfterViewInit.)
    if (
      (changes['energyUsesFacilitySummary'] && !changes['energyUsesFacilitySummary'].firstChange) ||
      (changes['displayHistory'] && !changes['displayHistory'].firstChange) ||
      changes['facility']
    ) {
      this.drawChart();
    }
  }

  // ---------------------------------------------------------------------------
  // Chart rendering
  // ---------------------------------------------------------------------------

  /**
   * Renders the appropriate Plotly chart into the #summaryChart element.
   * The chart type (treemap vs stacked area) is determined by the computed signal.
   */
  drawChart(): void {
    if (!this.summaryChart?.nativeElement) return;
    const config = this.chartConfig();
    if (!config) return;

    const plotlyConfig = {
      displaylogo: false,
      responsive: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'] as any[],
    };

    this.plotlyService.newPlot(this.summaryChart.nativeElement, config.data, config.layout, plotlyConfig);
  }

  // ---------------------------------------------------------------------------
  // History mode — stacked area chart showing all years
  // ---------------------------------------------------------------------------

  /**
   * Builds a stacked area chart with one trace per equipment group.
   * Each band's height represents that group's energy use for a given year.
   * Traces are stacked so the total height equals the facility total.
   */
  private buildHistoryChartConfig(summary: EnergyUsesFacilitySummary): { data: any[]; layout: any } {
    // Build a sorted, de-duplicated list of all years present in the totals
    const years = [...new Set(summary.totals.map(t => t.year))].sort((a, b) => a - b);

    const data = summary.footprintGroupSummaries.map(groupSummary => {
      // Map each year to the group's energy use for that year (0 if absent)
      const yValues = years.map(year => {
        const found = groupSummary.annualEnergyUse.find(a => a.year === year);
        return found ? found.totalEnergyUse : 0;
      });

      return {
        x: years,
        y: yValues,
        name: groupSummary.groupName,
        // stackgroup stacks all traces with the same group key
        stackgroup: 'one',
        mode: 'lines',
        fill: 'tonexty',
        line: { shape: 'spline', smoothing: 0.5, width: 1.5, color: groupSummary.groupColor },
        // Semi-transparent fill so individual bands remain visually distinct
        fillcolor: this.hexToRgba(groupSummary.groupColor, 0.7),
        hovertemplate: `<b>%{fullData.name}</b><br>Year: %{x}<br>Energy: %{y:,.0f} ${this.facility.energyUnit}<extra></extra>`,
      };
    });

    const layout = {
      title: { text: `Energy Use History — ${this.facility.name}`, font: { size: 15 } },
      showlegend: true,
      // Horizontal legend below the chart to avoid overlapping the plot area
      legend: { orientation: 'h', y: -0.25 },
      yaxis: {
        title: { text: `Energy Use (${this.facility.energyUnit})` },
        automargin: true,
        gridcolor: '#e8e8e8',
        zeroline: false,
      },
      xaxis: {
        title: { text: 'Year' },
        automargin: true,
        tickmode: 'linear',
        dtick: 1,
        tickformat: 'd', // force integer labels (no decimal years)
        type: 'linear',
        gridcolor: '#e8e8e8',
      },
      plot_bgcolor: '#fafafa',
      paper_bgcolor: '#ffffff',
      margin: { t: 50, b: 100, l: 70, r: 20 },
      // Unified hover shows all groups' values at the same year simultaneously
      hovermode: 'x unified',
    };

    return { data, layout };
  }

  // ---------------------------------------------------------------------------
  // Snapshot mode — treemap showing group share for the latest year
  // ---------------------------------------------------------------------------

  /**
   * Builds a treemap where each tile represents one equipment group.
   * Tile size is proportional to the group's percentage of total facility
   * energy use for the most recent year of data. This provides an at-a-glance
   * breakdown of where energy is consumed across groups.
   */
  private buildTreemapChartConfig(summary: EnergyUsesFacilitySummary): { data: any[]; layout: any } {
    // Use the latest year present in the totals array
    const latestYear = Math.max(...summary.totals.map(t => t.year));

    // Collect one entry per group with its latest-year values
    const entries = summary.footprintGroupSummaries
      .map(groupSummary => {
        const yearData = groupSummary.annualEnergyUse.find(a => a.year === latestYear);
        return {
          name: groupSummary.groupName,
          color: groupSummary.groupColor,
          percent: yearData?.percentOfFacilityUse ?? 0,
          energyUse: yearData?.totalEnergyUse ?? 0,
        };
      })
      // Exclude groups with no energy use so they don't clutter the treemap
      .filter(e => e.energyUse > 0);

    // Plotly treemap requires a root node; all group tiles are children of it.
    // The root label is shown in the breadcrumb bar at the top of the treemap.
    const rootLabel = `${this.facility.name} (${latestYear})`;

    // Build parallel arrays including the root node first, then one entry per group.
    // hovertemplate and texttemplate must be the same length as labels/parents/values,
    // so the root node gets its own (minimal) template entry.
    const labels = [rootLabel, ...entries.map(e => e.name)];
    const parents = ['', ...entries.map(() => rootLabel)];
    const values = [0, ...entries.map(e => e.energyUse)];
    const colors = ['rgba(0,0,0,0)', ...entries.map(e => e.color)];
    const hoverTemplates = [
      `<b>${rootLabel}</b><extra></extra>`,
      ...entries.map(e =>
        `<b>${e.name}</b><br>% of Facility: ${e.percent.toFixed(1)}%<br>Energy: ${e.energyUse.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${this.facility.energyUnit}<extra></extra>`
      )
    ];
    const textTemplates = [
      rootLabel,
      ...entries.map(e => `<b>${e.name}</b><br>${e.percent.toFixed(1)}%`)
    ];

    const trace = {
      type: 'treemap',
      labels,
      parents,
      values,
      // 'remainder' (default) means the root value is whatever is left after
      // children are accounted for — safe with a root value of 0.
      branchvalues: 'remainder',
      marker: {
        colors,
        line: { width: 2, color: '#ffffff' }
      },
      hovertemplate: hoverTemplates,
      texttemplate: textTemplates,
      textposition: 'middle center',
    };

    const layout = {
      // title: { text: `Energy Use by Equipment Group — ${latestYear}`, font: { size: 15 } },
      margin: { t: 20, b: 20, l: 10, r: 10 },
      paper_bgcolor: '#ffffff',
    };
    return { data: [trace], layout };
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Converts a hex color string (e.g. '#FF5733') to an rgba() string.
   * Used to apply semi-transparent fills to the stacked area chart traces.
   */
  private hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substr(0, 2), 16);
    const g = parseInt(clean.substr(2, 2), 16);
    const b = parseInt(clean.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

