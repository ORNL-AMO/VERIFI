import { Component, ElementRef, Input, SimpleChange, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-meter-energy-timeseries-graph',
  standalone: false,
  templateUrl: './meter-energy-timeseries-graph.component.html',
  styleUrl: './meter-energy-timeseries-graph.component.css'
})
export class MeterEnergyTimeseriesGraphComponent {

  @Input()
  meterData: Array<IdbUtilityMeterData>;
  @ViewChild('meterEnergyTimeSeriesGraph', { static: false }) meterEnergyTimeSeriesGraph: ElementRef;
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
          y: this.meterData.map(data => { return data.totalEnergyUse }),
          line: { color: '#7F7F7F', width: 4 },
          marker: {
            size: 8
          }
        }
      ];

      let height: number = 400;
      const containerWidth = this.meterEnergyTimeSeriesGraph.nativeElement.offsetWidth;

      var layout = {
        height: height,
        width: containerWidth,
        autosize: true,
        legend: {
          orientation: "h"
        },
        xaxis: {
          hoverformat: "%b, %Y"
        },
        yaxis: {
          title: {
            text: 'Energy (kWh)',
            font: {
              size: 16
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
      this.plotlyService.newPlot(this.meterEnergyTimeSeriesGraph.nativeElement, data, layout, config);
  }
}
