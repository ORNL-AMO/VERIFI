import { Component, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { YearGroupData } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-annual-actual-vs-adjusted-costs-graph',
  standalone: false,
  templateUrl: './annual-actual-vs-adjusted-costs-graph.component.html',
  styleUrl: './annual-actual-vs-adjusted-costs-graph.component.css',
})
export class AnnualActualVsAdjustedCostsGraphComponent {
  @Input()
  groupId: string;
  @Input()
  estimatedEnergyCostTable: YearGroupData;
  @Input()
  expectedEnergyCostTable: YearGroupData;
  @Input()
  rowKeys: Array<string | number>;

  viewInitialized: boolean = false;

  @ViewChild('comparisonGraph', { static: false }) comparisonGraph;

  constructor(
    private plotlyService: PlotlyService
  ) { }

  ngAfterViewInit() {
    this.viewInitialized = true;
    this.drawChart();
  }

  ngOnChanges() {
    if (this.viewInitialized) {
      this.drawChart();
    }
  }

  drawChart() {
    const years = this.rowKeys;
    const actualCosts = years.map(y => {
      const v = this.getValue(this.estimatedEnergyCostTable, y);
      return v === 0 ? null : v;
    });
    const adjustedCosts = years.map(y => {
      const v = this.getValue(this.expectedEnergyCostTable, y);
      return v === 0 ? null : v;
    });

    let trace1 = {
      x: years,
      y: actualCosts,
      mode: 'lines+markers',
      type: 'scatter',
      name: 'Actual Costs',
      hovertemplate: 'Year %{x}<br>Actual Cost: $%{y:.2f}<extra></extra>',
    };

    let trace2 = {
      x: years,
      y: adjustedCosts,
      mode: 'lines+markers',
      type: 'scatter',
      name: 'Adjusted Costs',
      hovertemplate: 'Year %{x}<br>Adjusted Cost: $%{y:.2f}<extra></extra>',
    };

    let data = [trace1, trace2];

    var layout = {
      xaxis: {
        title: { font: { size: 16 }},
        type: 'category',
      },
      yaxis: { 
        title: { text: 'Cost ($)', font: { size: 16 }, standoff: 18 }, 
        automargin: true 
      },
      showlegend: true,
      margin: { r: 10, t: 10 }
    };
    var config = {
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
      modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.comparisonGraph.nativeElement, data, layout, config);
  }

  getValue(table: YearGroupData, year: number | string): number {
    const key = String(year);
    const value = table?.[key]?.[this.groupId];
    return value === undefined || isNaN(value) || value === 0 || value === null ? 0 : value;
  }
}
