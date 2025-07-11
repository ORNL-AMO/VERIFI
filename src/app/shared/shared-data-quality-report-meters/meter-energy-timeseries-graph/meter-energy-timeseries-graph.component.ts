import { style } from '@angular/animations';
import { Component, ElementRef, Input, SimpleChange, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
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
  @Input()
  selectedMeter: IdbUtilityMeter; 
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
    const unit = this.selectedMeter.startingUnit;
    var data = [
      {
        type: "scatter",
        mode: "lines+markers",
        name: 'Meter Data',
        x: this.meterData.map(data => { return data.readDate }),
        y: this.meterData.map(data => { return data.totalEnergyUse }),
        line: { color: '#832a75', width: 3 },
        marker: {
          size: 8,
          color: '#43a047',
          symbol: 'circle',
          line: { width: 2, color: '#fff' }
        },
        hovertemplate: `Date: %{x}<br>Energy: %{y} ${unit} <extra></extra>`
      }
    ];

    let height: number = 400;
    const containerWidth = this.meterEnergyTimeSeriesGraph.nativeElement.offsetWidth;

    var layout = {
      height: height,
      width: containerWidth,
      autosize: true,
      plot_bgcolor: "#e7f1f2",
      paper_bgcolor: "#e7f1f2",
      legend: {
        orientation: "h"
      },
      xaxis: {
        hoverformat: "%b, %Y",
      },
      yaxis: {
        title: {
          text: `Energy (${unit})`,
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
    this.plotlyService.newPlot(this.meterEnergyTimeSeriesGraph.nativeElement, data, layout, config);
  }
}
