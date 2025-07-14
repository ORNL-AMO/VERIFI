import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';

@Component({
  selector: 'app-predictor-histogram-graph',
  standalone: false,

  templateUrl: './predictor-histogram-graph.component.html',
  styleUrl: './predictor-histogram-graph.component.css'
})
export class PredictorHistogramGraphComponent {

  @Input()
  predictorData: Array<IdbPredictorData>;
  @Input()
  selectedPredictor: IdbPredictor;

  @ViewChild('predictorHistogram', { static: false }) predictorHistogram: ElementRef;
  viewInitialized: boolean = false;
  meterEnergyHistogram: any;

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
    if (unit != null && unit != undefined && unit != '') {
      unit = '(' + unit + ')';
    }
    else
      unit = '';
    var data = [
      {
        type: "histogram",
        x: this.predictorData.map(data => { return data.amount }),
        marker: {
          color: '#833c60',
          line: { color: '#fff', width: 1 }
        },
        xbins: {
          size: 10000
        },
        hoverlabel: {
          bgcolor: "#1976d2",
          font: { color: "#fff", size: 14 }
        }
      }
    ];

    let height: number = 400;
    const containerWidth = this.predictorHistogram.nativeElement.offsetWidth;

    var layout = {
      height: height,
      width: containerWidth,
      autosize: true,
      plot_bgcolor: "#e7f1f2",
      paper_bgcolor: "#e7f1f2",
      xaxis: {
        title: {
          text: `<b>${this.selectedPredictor.name} ${unit}</b>`,
          font: {
            size: 16
          },
          standoff: 18
        },
        automargin: true,
      },
      bargap: 0.15
    };
    var config = {
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.predictorHistogram.nativeElement, data, layout, config);
  }
}


