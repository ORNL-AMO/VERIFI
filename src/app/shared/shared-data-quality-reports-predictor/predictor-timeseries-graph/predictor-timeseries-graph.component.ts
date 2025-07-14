import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';

@Component({
  selector: 'app-predictor-timeseries-graph',
  standalone: false,

  templateUrl: './predictor-timeseries-graph.component.html',
  styleUrl: './predictor-timeseries-graph.component.css'
})
export class PredictorTimeseriesGraphComponent {

  @Input()
  predictorData: Array<IdbPredictorData>;
  @Input()
  selectedPredictor: IdbPredictor;

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
      return '&#8457;';
    }
    return '';
  }

  drawChart() {
    let unit = this.calculateUnit();
    if(unit != null && unit != undefined && unit != '') {
      unit = '(' + unit + ')';
    }
    else 
      unit = '';
    var data = [
      {
        type: "scatter",
        mode: "lines+markers",
        name: 'Predictor Data',
        x: this.predictorData.map(data => { return data.date }),
        y: this.predictorData.map(data => { return data.amount }),
        line: { color: '#832a75', width: 3 },
        marker: {
          size: 8,
          color: '#43a047',
          symbol: 'circle',
          line: { width: 2, color: '#fff' }
        },
         hovertemplate: `Date: %{x}<br>${this.selectedPredictor.name}: %{y} ${unit} <extra></extra>`
      }
    ];

    let height: number = 400;
    const containerWidth = this.predictorTimeSeriesGraph.nativeElement.offsetWidth;

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
}

