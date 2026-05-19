import { Component, computed, ElementRef, inject, Input, OnChanges, signal, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { EnergyUsesGroupSummary } from 'src/app/calculations/energy-footprint/energyUsesGroupSummary';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-energy-uses-group-summary-chart',
  standalone: false,
  templateUrl: './facility-energy-uses-group-summary-chart.component.html',
  styleUrl: './facility-energy-uses-group-summary-chart.component.css',
})
export class FacilityEnergyUsesGroupSummaryChartComponent implements OnChanges {

  @Input({ required: true })
  set energyUsesGroupSummary(value: EnergyUsesGroupSummary) {
    this.energyUsesGroupSummary$.set(value);
  }
  get energyUsesGroupSummary(): EnergyUsesGroupSummary {
    return this.energyUsesGroupSummary$();
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

  private energyUsesGroupSummary$ = signal<EnergyUsesGroupSummary | null>(null);
  private displayHistory$ = signal<boolean>(false);

  private plotlyService: PlotlyService = inject(PlotlyService);

  @ViewChild('summaryChart', { static: false }) summaryChart: ElementRef;

  // ---------------------------------------------------------------------------
  // Reactive chart data — recomputed whenever inputs change
  // ---------------------------------------------------------------------------

  /**
   * Derived chart traces and layout, computed from the current inputs.
   * Switching displayHistory mode rebuilds the data entirely.
   */
  private chartConfig = computed(() => {
    const summary = this.energyUsesGroupSummary$();
    const showHistory = this.displayHistory$();
    if (!summary || !this.facility) return null;
    return showHistory
      ? this.buildHistoryChartConfig(summary)
      : this.buildSnapshotChartConfig(summary);
  });

  // ---------------------------------------------------------------------------
  // Angular lifecycle hooks
  // ---------------------------------------------------------------------------

  ngAfterViewInit(): void {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Redraw whenever any input changes after the view has been initialized.
    // (First change on energyUsesGroupSummary is handled by ngAfterViewInit.)
    if (
      (changes['energyUsesGroupSummary'] && !changes['energyUsesGroupSummary'].firstChange) ||
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
   * Renders the appropriate chart into the #summaryChart element.
   * Delegates to Plotly; the data/layout are derived from the computed signal.
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
   * Builds a stacked area chart (one trace per equipment).
   * Each trace shows annual energy use across all available years.
   * Traces are stacked so the visible area of each band represents that
   * equipment's contribution to the group total for each year.
   */
  private buildHistoryChartConfig(summary: EnergyUsesGroupSummary): { data: any[]; layout: any } {
    // Build a sorted, de-duplicated list of all years present in the data
    const years = [...new Set(summary.totalAnnualEnergyUse.map(t => t.year))].sort((a, b) => a - b);

    const data = summary.equipmentAnnualEnergyUse.map(equipmentSummary => {
      // Map each year to that equipment's energy use (0 if year has no entry)
      const yValues = years.map(year => {
        const found = equipmentSummary.annualEnergyUse.find(a => a.year === year);
        return found ? found.energyUse : 0;
      });

      return {
        x: years,
        y: yValues,
        name: equipmentSummary.equipmentName,
        // stackgroup causes Plotly to stack traces — each band shows individual contribution
        stackgroup: 'one',
        mode: 'lines',
        fill: 'tonexty',
        line: { shape: 'spline', smoothing: 0.5, width: 1.5, color: equipmentSummary.equipmentColor },
        fillcolor: this.hexToRgba(equipmentSummary.equipmentColor, 0.7),
        hovertemplate: `<b>%{fullData.name}</b><br>Year: %{x}<br>Energy: %{y:,.0f} ${this.facility.energyUnit}<extra></extra>`,
      };
    });

    const layout = {
      title: { text: `Energy Use History — ${summary.groupName}`, font: { size: 15 } },
      showlegend: true,
      legend: { orientation: 'h', y: -0.2 },
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
        tickformat: 'd',
        type: 'linear',
        gridcolor: '#e8e8e8',
      },
      plot_bgcolor: '#fafafa',
      paper_bgcolor: '#ffffff',
      margin: { t: 50, b: 80, l: 70, r: 20 },
      hovermode: 'x unified',
    };

    return { data, layout };
  }

  // ---------------------------------------------------------------------------
  // Snapshot mode — horizontal bar chart for the latest year
  // ---------------------------------------------------------------------------

  /**
   * Builds a horizontal bar chart showing each equipment's share of the
   * group total energy use for the most recent year of data.
   * Bars are sorted descending by percentage so the largest consumers appear first.
   */
  private buildSnapshotChartConfig(summary: EnergyUsesGroupSummary): { data: any[]; layout: any } {
    // Identify the latest year present in the summary
    const latestYear = Math.max(...summary.totalAnnualEnergyUse.map(t => t.year));

    // Build one entry per equipment with its percentage for the latest year
    const entries = summary.equipmentAnnualEnergyUse
      .map(equipmentSummary => {
        const yearData = equipmentSummary.annualEnergyUse.find(a => a.year === latestYear);
        return {
          name: equipmentSummary.equipmentName,
          color: equipmentSummary.equipmentColor,
          percent: yearData?.percentOfEquipmentGroupTotal ?? 0,
          energyUse: yearData?.energyUse ?? 0,
        };
      })
      // Sort largest percentage to top (Plotly renders bottom-to-top for horizontal bars)
      .sort((a, b) => a.percent - b.percent);

    const trace = {
      type: 'bar',
      orientation: 'h',
      // Equipment names on y-axis; percentage values on x-axis
      x: entries.map(e => e.percent),
      y: entries.map(e => e.name),
      marker: { color: entries.map(e => e.color) },
      hovertemplate: entries.map(e =>
        `<b>${e.name}</b><br>% of Total: ${e.percent.toFixed(1)}%<br>Energy: ${e.energyUse.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${this.facility.energyUnit}<extra></extra>`
      ),
      text: entries.map(e => `${e.percent.toFixed(1)}%`),
      textposition: 'outside',
      cliponaxis: false,
    };

    const layout = {
      title: { text: `Energy Use by Equipment — ${latestYear}`, font: { size: 15 } },
      showlegend: false,
      xaxis: {
        title: { text: '% of Group Total' },
        automargin: true,
        range: [0, 110], // leave room for outside labels
        gridcolor: '#e8e8e8',
        zeroline: false,
        ticksuffix: '%',
      },
      yaxis: {
        automargin: true,
        tickfont: { size: 12 },
      },
      plot_bgcolor: '#fafafa',
      paper_bgcolor: '#ffffff',
      margin: { t: 50, b: 60, l: 20, r: 60 },
    };

    return { data: [trace], layout };
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Converts a hex color string (e.g. '#FF5733') to an rgba() CSS string with
   * the given alpha value. Used to add semi-transparent fills to area chart traces.
   */
  private hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substr(0, 2), 16);
    const g = parseInt(clean.substr(2, 2), 16);
    const b = parseInt(clean.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

