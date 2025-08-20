import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { Statistics } from '../meterDataQualityStatistics';

@Component({
  selector: 'app-meter-cost-timeseries-graph',
  standalone: false,

  templateUrl: './meter-cost-timeseries-graph.component.html',
  styleUrl: './meter-cost-timeseries-graph.component.css'
})
export class MeterCostTimeseriesGraphComponent {

  @Input({ required: true })
  meterData: Array<IdbUtilityMeterData>;
  @Input({ required: true })
  costStats: Statistics;



  @ViewChild('meterCostTimeSeriesGraph', { static: false }) meterCostTimeSeriesGraph: ElementRef;


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

    this.meterData = this.meterData.filter(data => { return isNaN(data.totalCost) == false }).slice().sort((a, b) => new Date(a.readDate).getTime() - new Date(b.readDate).getTime());
    let markers: Array<{
      color: string,
      symbol: string,
      size: number
    }> = this.meterData.map(data => { return this.getMarker(data.totalCost) });

    let markerSizes: Array<number> = markers.map(marker => marker.size);
    let markerColors: Array<string> = markers.map(marker => marker.color);
    let markerSymbols: Array<string> = markers.map(marker => marker.symbol);

    var data = [
      {
        type: "scatter",
        mode: "lines+markers",
        name: 'Meter Data',
        x: this.meterData.map(data => { return data.readDate }),
        y: this.meterData.map(data => { return data.totalCost }),
        line: { color: '#832a75', width: 3 },
        marker: {
          color: markerColors,
          size: markerSizes,
          symbol: markerSymbols,
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
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
      modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.meterCostTimeSeriesGraph.nativeElement, data, layout, config);
  }


  getMarker(cost: number) {
    if (cost >= this.costStats.medianminus2_5MAD && cost <= this.costStats.medianplus2_5MAD) {
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




