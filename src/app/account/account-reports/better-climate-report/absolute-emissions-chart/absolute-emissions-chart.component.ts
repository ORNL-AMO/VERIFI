import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { getEmissionsTypeColor } from 'src/app/models/eGridEmissions';

@Component({
    selector: 'app-absolute-emissions-chart',
    templateUrl: './absolute-emissions-chart.component.html',
    styleUrls: ['./absolute-emissions-chart.component.css'],
    standalone: false
})
export class AbsoluteEmissionsChartComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  emissionsDisplay: 'market' | 'location'
  @ViewChild('absoluteEmissionsStackedBarChart', { static: false }) absoluteEmissionsStackedBarChart: ElementRef;

  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart()
  }


  drawChart() {
    let data = new Array();
    if(this.emissionsDisplay == 'market' && this.yearDetails.find(dataItem => { return dataItem.emissionsResults.scope2MarketEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.emissionsResults.scope2MarketEmissions }),
        name: 'Scope 2: Electricity (Market)',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 2: Electricity (Market)')
        }
      });
    }

    if(this.emissionsDisplay == 'location' && this.yearDetails.find(dataItem => { return dataItem.emissionsResults.scope2LocationEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.emissionsResults.scope2LocationEmissions }),
        name: 'Scope 2: Electricity (Location)',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 2: Electricity (Location)')
        }
      });
    }
    
    if(this.yearDetails.find(dataItem => { return dataItem.emissionsResults.otherScope2Emissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.emissionsResults.otherScope2Emissions }),
        name: 'Scope 2: Other',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 2: Other')
        }
      });
    }

    
    if(this.yearDetails.find(dataItem => { return dataItem.emissionsResults.stationaryEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.emissionsResults.stationaryEmissions }),
        name: 'Scope 1: Stationary',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 1: Stationary')
        }
      });
    }
    if(this.yearDetails.find(dataItem => { return dataItem.emissionsResults.mobileTotalEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.emissionsResults.mobileTotalEmissions }),
        name: 'Scope 1: Mobile',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 1: Mobile')
        }
      });
    }

    if(this.yearDetails.find(dataItem => { return dataItem.emissionsResults.fugitiveEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.emissionsResults.fugitiveEmissions }),
        name: 'Scope 1: Fugitive',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 1: Fugitive')
        }
      });
    }

    if(this.yearDetails.find(dataItem => { return dataItem.emissionsResults.processEmissions != 0 })){
      data.push({
        x: this.yearDetails.map(dataItem => { return dataItem.year }),
        y: this.yearDetails.map(dataItem => { return dataItem.emissionsResults.processEmissions }),
        name: 'Scope 1: Process',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 1: Process')
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
        automargin: true,
        dtick: '1'
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
