import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { PredictorStatistics } from '../predictorDataQualityStatistics';

@Component({
  selector: 'app-predictor-timeseries-graph',
  standalone: false,

  templateUrl: './predictor-timeseries-graph.component.html',
  styleUrl: './predictor-timeseries-graph.component.css'
})
export class PredictorTimeseriesGraphComponent {

  @Input({ required: true })
  predictorData: Array<IdbPredictorData>;
  @Input({ required: true })
  selectedPredictor: IdbPredictor;
  @Input({ required: true })
  stats: PredictorStatistics;

  @ViewChild('predictorTimeSeriesGraph', { static: false }) predictorTimeSeriesGraph: ElementRef;
  viewInitialized: boolean = false;

  constructor(private plotlyService: PlotlyService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['predictorData'] && this.viewInitialized) {
      this.drawChart();
    }
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
    if (this.predictorData) {
      this.drawChart();
    }
  }

  calculateUnit(): string {
    if (this.selectedPredictor.unit && this.selectedPredictor.predictorType != 'Weather') {
      return this.selectedPredictor.unit;
    } else if (this.selectedPredictor.predictorType == 'Weather') {
      if (this.selectedPredictor.weatherDataType == 'CDD' || this.selectedPredictor.weatherDataType == 'HDD') {
        return 'days';
      } else if (this.selectedPredictor.weatherDataType == 'dryBulbTemp') {
        return '&#8457;';
      } else if (this.selectedPredictor.weatherDataType == 'relativeHumidity') {
        return '%';
      }
    }
    return '';
  }

  drawChart() {
    let unit = this.calculateUnit();
    if (unit != null && unit != undefined && unit != '') {
      unit = '(' + unit + ')';
    }
    else {
      unit = '';
    }


    let markers: Array<{
      color: string,
      symbol: string,
      size: number
    }> = this.predictorData.map(data => { return this.getMarker(data.amount) });

    let markerSizes: Array<number> = markers.map(marker => marker.size);
    let markerColors: Array<string> = markers.map(marker => marker.color);
    let markerSymbols: Array<string> = markers.map(marker => marker.symbol);

    var data = [
      {
        type: "scatter",
        mode: "lines+markers",
        name: 'Predictor Data',
        x: this.predictorData.map(data => { return data.date }),
        y: this.predictorData.map(data => { return data.amount }),
        line: { color: '#832a75', width: 3 },
        marker: {
          color: markerColors,
          size: markerSizes,
          symbol: markerSymbols,
          line: { width: 2, color: '#fff' }
        },
        hovertemplate: `Date: %{x}<br>${this.selectedPredictor.name}: %{y} ${unit} <extra></extra>`
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
          text: `${this.selectedPredictor.name} ${unit}`,
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
    this.plotlyService.newPlot(this.predictorTimeSeriesGraph.nativeElement, data, layout, config);
  }


  getMarker(dataValue: number) {
    if (dataValue > this.stats.medianminus2_5MAD && dataValue < this.stats.medianplus2_5MAD) {
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

