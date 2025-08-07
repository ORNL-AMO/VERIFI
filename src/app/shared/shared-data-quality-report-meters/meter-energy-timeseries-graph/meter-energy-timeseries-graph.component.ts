import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getConsumptionData, getUnitFromMeter, Statistics } from '../meterDataQualityStatistics';

@Component({
  selector: 'app-meter-energy-timeseries-graph',
  standalone: false,
  templateUrl: './meter-energy-timeseries-graph.component.html',
  styleUrl: './meter-energy-timeseries-graph.component.css'
})
export class MeterEnergyTimeseriesGraphComponent {

  @Input({ required: true })
  meterData: Array<IdbUtilityMeterData>;
  @Input({ required: true })
  selectedMeter: IdbUtilityMeter;
  @Input({ required: true })
  energyStats: Statistics;



  @ViewChild('meterEnergyTimeSeriesGraph', { static: false }) meterEnergyTimeSeriesGraph: ElementRef;
  viewInitialized: boolean = false;
  meterDataToPlot: number[];
  unit: string;

  constructor(private plotlyService: PlotlyService
  ) { }

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

  getDataAndUnit() {
    this.meterData = this.meterData.slice().sort((a, b) => new Date(a.readDate).getTime() - new Date(b.readDate).getTime());
    this.unit = getUnitFromMeter(this.selectedMeter, this.meterData);
    this.meterDataToPlot = getConsumptionData(this.meterData, this.selectedMeter);
  }

  drawChart() {
    this.getDataAndUnit();

    let markers: Array<{
      color: string,
      symbol: string,
      size: number
    }> = this.meterDataToPlot.map(data => { return this.getMarker(data) });

    let markerSizes: Array<number> = markers.map(marker => marker.size);
    let markerColors: Array<string> = markers.map(marker => marker.color);
    let markerSymbols: Array<string> = markers.map(marker => marker.symbol);


    var data = [
      {
        type: "scatter",
        mode: "lines+markers",
        name: 'Meter Data',
        x: this.meterData.map(data => { return data.readDate }),
        y: this.meterDataToPlot,
        line: { color: '#832a75', width: 3 },
        marker: {
          color: markerColors,
          size: markerSizes,
          symbol: markerSymbols,
          line: { width: 2, color: '#fff' }
        },
        hovertemplate: `Date: %{x}<br>Total Consumption: %{y} ${this.unit} <extra></extra>`
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
        hoverformat: "%b, %Y",
      },
      yaxis: {
        title: {
          text: `Total Consumption (${this.unit})`,
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
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
      modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.meterEnergyTimeSeriesGraph.nativeElement, data, layout, config);
  }

  getMarker(energyUse: number) {
    if (energyUse >= this.energyStats.medianminus2_5MAD && energyUse <= this.energyStats.medianplus2_5MAD) {
      return {
        size: 8,
        color: '#43a047',
        symbol: 'circle',
        line: { width: 2, color: '#fff' }
      };
    } else {
      return {
        size: 12,
        color: '#d32f2f',
        symbol: 'x',
        line: { width: 2, color: '#fff' }
      };
    }
  }
}
