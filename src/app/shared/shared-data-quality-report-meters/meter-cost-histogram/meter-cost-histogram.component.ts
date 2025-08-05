import { Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-meter-cost-histogram',
  standalone: false,
  templateUrl: './meter-cost-histogram.component.html',
  styleUrl: './meter-cost-histogram.component.css'
})
export class MeterCostHistogramComponent {

  @Input()
  meterData: Array<IdbUtilityMeterData>;

  @ViewChild('meterCostHistogram', { static: false }) meterCostHistogram: ElementRef;
  viewInitialized: boolean = false;
  numberOfBins: number = 50;
  binSize: number;

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

  updateGraph() {
    if (this.viewInitialized) {
      this.drawChart();
    }
  }

  drawChart() {
    const min = Math.min(...this.meterData.map(data => data.totalCost));
    const max = Math.max(...this.meterData.map(data => data.totalCost));
    this.binSize = this.numberOfBins && this.numberOfBins > 1 ? (max - min) / (this.numberOfBins) : (max);
    this.binSize = Math.ceil(this.binSize)
    var data = [
      {
        type: "histogram",
        x: this.meterData.map(data => { return data.totalCost }),
        marker: {
          color: '#833c60',
          line: { color: '#fff', width: 1 }
        },
        xbins: {
          start: min,
          size: this.binSize,
          end: max
        },
        hoverlabel: {
          bgcolor: "#1976d2",
          font: { color: "#fff", size: 14 }
        }
      }
    ];

    let height: number = 400;
    var layout = {
      height: height,
      autosize: true,
      plot_bgcolor: "#e7f1f2",
      paper_bgcolor: "#e7f1f2",
      xaxis: {
        title: {
          text: '<b>Total Cost ($)</b>',
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
    this.plotlyService.newPlot(this.meterCostHistogram.nativeElement, data, layout, config);
  }
}
