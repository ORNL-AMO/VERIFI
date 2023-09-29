import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { EmissionsColors } from 'src/app/shared/utilityColors';

@Component({
  selector: 'app-absolute-emissions-chart',
  templateUrl: './absolute-emissions-chart.component.html',
  styleUrls: ['./absolute-emissions-chart.component.css']
})
export class AbsoluteEmissionsChartComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;

  @ViewChild('absoluteEmissionsStackedBarChart', { static: false }) absoluteEmissionsStackedBarChart: ElementRef;

  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart()
  }


  drawChart() {
    let data = new Array();
    if(this.yearDetails.find(dataItem => { return dataItem.scope2MarketEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.scope2MarketEmissions }),
        name: 'Scope 2 Market Emissions',
        type: 'bar',
        marker: {
          color: EmissionsColors["scope2Market"]
        }
      });
    }

    if(this.yearDetails.find(dataItem => { return dataItem.scope2LocationEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.scope2LocationEmissions }),
        name: 'Scope 2 Location Emissions',
        type: 'bar',
        marker: {
          color: EmissionsColors["scope2Location"]
        }
      });
    }

    
    if(this.yearDetails.find(dataItem => { return dataItem.stationaryEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.stationaryEmissions }),
        name: 'Stationary Emissions',
        type: 'bar',
        marker: {
          color: EmissionsColors["stationary"]
        }
      });
    }
    if(this.yearDetails.find(dataItem => { return dataItem.mobileEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.mobileEmissions }),
        name: 'Mobile Emissions',
        type: 'bar',
        marker: {
          color: EmissionsColors["mobile"]
        }
      });
    }

    if(this.yearDetails.find(dataItem => { return dataItem.fugitiveEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.fugitiveEmissions }),
        name: 'Fugitive Emissions',
        type: 'bar',
        marker: {
          color: EmissionsColors["fugitive"]
        }
      });
    }

    if(this.yearDetails.find(dataItem => { return dataItem.processEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.processEmissions }),
        name: 'Process Emissions',
        type: 'bar',
        marker: {
          color: EmissionsColors["process"]
        }
      });
    }


    var layout = {
      barmode: 'group',
      showlegend: true,
      yaxis: {
        title: 'Total Emissions (Tonne CO<sub>2</sub>e)',
        automargin: true,
      },
      xaxis: {
        automargin: true
      },
      legend: {
        orientation: "h"
      },
      clickmode: "none",
      margin: { t: 10 }
    };
    let config = {
      modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
      displaylogo: false,
      responsive: true,
    };
    this.plotlyService.newPlot(this.absoluteEmissionsStackedBarChart.nativeElement, data, layout, config);
  }
}
