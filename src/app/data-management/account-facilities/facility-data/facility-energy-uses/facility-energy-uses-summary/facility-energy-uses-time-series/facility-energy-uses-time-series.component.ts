import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { EnergyFootprintFacility } from 'src/app/calculations/energy-footprint/energyFootprintFacility';

@Component({
  selector: 'app-facility-energy-uses-time-series',
  standalone: false,
  templateUrl: './facility-energy-uses-time-series.component.html',
  styleUrl: './facility-energy-uses-time-series.component.css'
})
export class FacilityEnergyUsesTimeSeriesComponent {
  @Input({ required: true })
  energyFootprintFacility: EnergyFootprintFacility;

  @ViewChild('energyFootprintTimeSeriesGraph', { static: false }) energyFootprintTimeSeriesGraph: ElementRef;

  constructor(private plotlyService: PlotlyService) { }



  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.energyFootprintTimeSeriesGraph) {
      let traces = [];
      this.energyFootprintFacility.footprintGroups.forEach(group => {
        let trace = {
          x: group.annualEnergyUse.map(data => data.year),
          y: group.annualEnergyUse.map(data => data.energyUse),
          type: 'scatter',
          mode: 'lines+markers',
          name: group.groupName,
          stackgroup: 'one'
        };
        traces.push(trace);
      });
      let layout = {
        title: { text: 'Facility Energy Use Over Time' },
        legend: {
          orientation: "h"
        },
        xaxis: {
          title: { text: 'Year' },
          automargin: true,
          type: 'date',
          dtick: "M12", // Tick every 12 months (1 year)
          tickformat: "%Y"
        },
        yaxis: {
          title: { text: 'Energy Use' },
          automargin: true
        }
      };
      var config = {
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.energyFootprintTimeSeriesGraph.nativeElement, traces, layout, config);
    }
  }

}
