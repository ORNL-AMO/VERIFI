import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { getEmissionsTypeColor } from 'src/app/models/eGridEmissions';

@Component({
    selector: 'app-emissions-reductions-chart',
    templateUrl: './emissions-reductions-chart.component.html',
    styleUrls: ['./emissions-reductions-chart.component.css'],
    standalone: false
})
export class EmissionsReductionsChartComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;


  @ViewChild('emissionsReductionChart', { static: false }) emissionsReductionChart: ElementRef;

  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart()
  }

  drawChart() {
    let traceData = new Array();

    let trace = {
      x: this.yearDetails.map(yearDetail => { return yearDetail.year }),
      y: this.yearDetails.map(yearDetail => { return yearDetail.totalEmissionsReduction }),
      name: 'Total Emissions Reduction',
      type: 'bar',
      yaxis: 'y1',
      marker: {
        color: getEmissionsTypeColor('All Emissions')
      }
      // text: monthlyDataInRange.map(item => { return cMeter.meter.name }),
      // stackgroup: 'one',
      // marker: {
      //   color: UtilityColors[cMeter.meter.source].color,
      // },
      // hovertemplate: this.getHoverTemplate(),
    }
    traceData.push(trace);

    let trace2 = {
      x: this.yearDetails.map(yearDetail => { return yearDetail.year }),
      y: this.yearDetails.map(yearDetail => { return yearDetail.percentEmissionsReduction }),
      name: 'Percent Reduction',
      type: 'scatter',
      yaxis: 'y2',
      marker: {
        size: 16,
        color: '#27AE60'
      }
    }
    traceData.push(trace2)
    var layout = {
      legend: {
        orientation: "h"
      },
      xaxis: {
        dtick: '1'
        // autotick: false,
        // range: xrange
      },
      yaxis: {
        title: {
          text: "Tonne CO<sub>2</sub>e Reduction"
        },
        hoverformat: ",.2f",
        rangemode: 'tozero',
        tickmode: 'sync'
      },
      yaxis2: {
        title: {
          text: '% Reduction',
          font: {
            size: 16
          }
        },
        // hoverformat: hoverformat2,
        // ticksuffix: tickSuffix2,
        // tickprefix: tickPrefix2,
        automargin: true,
        overlaying: 'y1',
        side: 'right',
        rangemode: 'tozero',
        tickmode: 'sync'
      }
    }

    let config = {
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
      displaylogo: false,
      responsive: true,
    };
    this.plotlyService.newPlot(this.emissionsReductionChart.nativeElement, traceData, layout, config);
  }
}

