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

    const data = summary.footprintGroups.map(groupSummary => {
      // Map each year to the group's energy use for that year (0 if absent)
      const yValues = years.map(year => {
        const found = groupSummary.totalAnnualEnergyUse.find(a => a.year === year);
        return found ? found.energyUse : 0;
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

    // Collect one entry per group with its latest-year values, then equipment children
    const groupEntries = summary.footprintGroups
      .map(groupSummary => {
        const yearData = groupSummary.totalAnnualEnergyUse.find(a => a.year === latestYear);
        const equipment = groupSummary.equipmentAnnualEnergyUse
          .map(equip => {
            const equipYear = equip.annualEnergyUse.find(a => a.year === latestYear);
            return {
              id: `equip_${equip.equipmentGuid}`,
              name: equip.equipmentName,
              color: groupSummary.groupColor,
              energyUse: equipYear?.energyUse ?? 0,
              percentOfGroup: equipYear?.percentOfEquipmentGroupTotal ?? 0,
              percentOfFacility: equipYear?.percentOfFacilityUse ?? 0,
            };
          })
          .filter(e => e.energyUse > 0);
        return {
          id: `group_${groupSummary.groupId}`,
          name: groupSummary.groupName,
          color: groupSummary.groupColor,
          percent: yearData?.percentOfFacilityUse ?? 0,
          energyUse: yearData?.energyUse ?? 0,
          equipment,
        };
      })
      // Exclude groups with no energy use so they don't clutter the treemap
      .filter(g => g.energyUse > 0);

    // Plotly treemap requires a root node; all group tiles are children of it.
    // The root label is shown in the breadcrumb bar at the top of the treemap.
    const rootId = 'root';
    const rootLabel = `${this.facility.name} (${latestYear})`;

    // Root value must equal the sum of all group values when branchvalues='total'
    const rootTotal = groupEntries.reduce((sum, g) => sum + g.energyUse, 0);

    const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

    // Build parallel arrays: root → groups → equipment (one item per node)
    const ids: string[] = [rootId];
    const labels: string[] = [rootLabel];
    const parents: string[] = [''];
    const values: number[] = [rootTotal];
    const colors: string[] = ['rgba(0, 0, 0, 0.2)'];
    const hoverTemplates: string[] = [
      `<b>${rootLabel}</b><br>Total Energy: ${fmt(rootTotal)} ${this.facility.energyUnit}/yr<extra></extra>`
    ];
    const textTemplates: string[] = [rootLabel];

    for (const g of groupEntries) {
      ids.push(g.id);
      labels.push(g.name);
      parents.push(rootId);
      values.push(g.energyUse);
      colors.push(g.color);
      hoverTemplates.push(
        `<b>${g.name}</b><br>% of Facility: ${g.percent.toFixed(1)}%<br>Energy: ${fmt(g.energyUse)} ${this.facility.energyUnit}/yr<extra></extra>`
      );
      textTemplates.push(`<b>${g.name}</b><br>${fmt(g.percent)}%`);

      for (const equip of g.equipment) {
        const equipPercentOfFacility = rootTotal > 0 ? (equip.energyUse / rootTotal) * 100 : 0;
        ids.push(equip.id);
        labels.push(equip.name);
        parents.push(g.id);
        values.push(equip.energyUse);
        colors.push(equip.color);
        hoverTemplates.push(
          `<b>${equip.name}</b><br>Energy: ${fmt(equip.energyUse)} ${this.facility.energyUnit}/yr<br>% of Facility: ${equipPercentOfFacility.toFixed(1)}%<br>% of Group: ${equip.percentOfGroup.toFixed(1)}%<extra></extra>`
        );
        textTemplates.push(`${equip.name}<br>${fmt(equip.percentOfFacility)}%`);
      }
    }

    const trace = {
      type: 'treemap',
      ids,
      labels,
      parents,
      values,
      // 'total' means each parent's value is the explicit sum provided,
      // and children are sized proportionally within it.
      branchvalues: 'total',
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

