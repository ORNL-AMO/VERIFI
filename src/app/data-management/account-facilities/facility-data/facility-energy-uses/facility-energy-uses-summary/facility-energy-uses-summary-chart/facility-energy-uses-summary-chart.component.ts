import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { title } from 'node:process';
import { EnergyFootprintFacility } from 'src/app/calculations/energy-footprint/energyFootprintFacility';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-energy-uses-summary-chart',
  standalone: false,
  templateUrl: './facility-energy-uses-summary-chart.component.html',
  styleUrl: './facility-energy-uses-summary-chart.component.css',
})
export class FacilityEnergyUsesSummaryChartComponent {
  @Input({ required: true })
  energyFootprintFacility: EnergyFootprintFacility;
  @Input({ required: true })
  facility: IdbFacility;

  @ViewChild('summaryChart', { static: false }) summaryChart: ElementRef;

  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart()
  }


  drawChart() {
    // Prepare x-axis (years) from the totals array (all years in order)
    // Ensure years are sorted and unique integers
    const years = (this.energyFootprintFacility?.totals?.map(t => t.year) || []).sort((a, b) => a - b);

    // Prepare traces for each group
    const data = (this.energyFootprintFacility?.footprintGroupSummaries || []).map(groupSummary => {
      // Ensure annualEnergyUse is sorted by year to match x-axis
      const annuals = years.map(year => {
        const found = groupSummary.annualEnergyUse.find(a => a.year === year);
        return found ? found.totalEnergyUse : 0;
      });
      return {
        x: years,
        y: annuals,
        name: groupSummary.groupName,
        stackgroup: 'one',
        mode: 'lines',
        line: { shape: 'linear' },
        type: 'scatter',
        hovertemplate: '%{y:.2f} Energy Use<extra>%{fullData.name}</extra>'
      };
    });

    var layout = {
      showlegend: true,
      title:{
        text: `Energy Use Summary for ${this.facility.name}`,
      },
      yaxis: {
        title: {
          text: `Total Energy Use <br>${this.facility.energyUnit}`,
        },
        automargin: true,
      },
      xaxis: {
        automargin: true,
        title: {
          text: 'Year'
        },
        tickmode: 'linear',
        dtick: 1,
        tickformat: 'd', // integer format
        type: 'linear',
      },
      legend: {
        // orientation: "h"
      },
      clickmode: "none",
      // margin: { t: 10 },
    };
    let config = {
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
      modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
      displaylogo: false,
      responsive: true,
    };
    this.plotlyService.newPlot(this.summaryChart.nativeElement, data, layout, config);
  }
}
