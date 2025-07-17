import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-meter-cost-timeseries-graph',
  standalone: false,

  templateUrl: './meter-cost-timeseries-graph.component.html',
  styleUrl: './meter-cost-timeseries-graph.component.css'
})
export class MeterCostTimeseriesGraphComponent {

  @Input()
  meterData: Array<IdbUtilityMeterData>;
  @ViewChild('meterCostTimeSeriesGraph', { static: false }) meterCostTimeSeriesGraph: ElementRef;
  allCostsNull: boolean = false;
  viewInitialized: boolean = false;

  constructor(private plotlyService: PlotlyService) { }


  ngOnChanges(changes: SimpleChanges) {
    if (changes['meterData'] && this.viewInitialized) {
      this.drawChart();
    }
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
    if (this.meterData) {
      this.drawChart();
    }
  }

  drawChart() {
    var data = [
      {
        type: "scatter",
        mode: "lines+markers",
        name: 'Meter Data',
        x: this.meterData.map(data => { return data.readDate }),
        y: this.meterData.map(data => { return data.totalCost }),
        line: { color: '#832a75', width: 3 },
        marker: {
          size: 8,
          color: '#43a047',
          symbol: 'circle',
          line: { width: 2, color: '#fff' }
        },
        hovertemplate: 'Date: %{x}<br>Cost: $%{y}<extra></extra>',
      }
    ];

    let height: number = 400;
    var layout = {
      height: height,
      autosize: true,
      plot_bgcolor: "#e7f1f2",
      paper_bgcolor: "#e7f1f2",
      legend: {
        orientation: "h"
      },
      xaxis: {
        hoverformat: "%b, %Y"
      },
      yaxis: {
        title: {
          text: 'Cost ($)',
          font: {
            size: 16,
            weight: "bold"
          },
          standoff: 18
        },
        automargin: true,
      },
      margin: { r: 0, t: 50 }
    };
    var config = {
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.meterCostTimeSeriesGraph.nativeElement, data, layout, config);
  }
}




