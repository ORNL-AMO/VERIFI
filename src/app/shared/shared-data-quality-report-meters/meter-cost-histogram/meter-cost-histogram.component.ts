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
  @Input()
  binSize: number = 10;
  @Output()
  onBinSizeChange: EventEmitter<number> = new EventEmitter<number>();

  @ViewChild('meterCostHistogram', { static: false }) meterCostHistogram: ElementRef;
  viewInitialized: boolean = false;
  numberOfBins: number = 10;

  constructor(private plotlyService: PlotlyService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['meterData'] && this.viewInitialized && changes['binSize']) {
      this.numberOfBins = this.binSize;
      this.drawChart();
    }
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
    if (this.meterData) {
      this.numberOfBins = this.binSize;
      this.drawChart();
    }
  }

  updateGraph() {
    this.onBinSizeChange.emit(this.numberOfBins);
    if (this.viewInitialized) {
      this.drawChart();
    }
  }

  drawChart() {
    const min = Math.min(...this.meterData.map(data => data.totalCost));
    const max = Math.max(...this.meterData.map(data => data.totalCost));
    const binSize = (max - min) / this.numberOfBins;
    var data = [
      {
        type: "histogram",
        x: this.meterData.map(data => { return data.totalCost }),
        marker: {
          color: '#833c60',
          line: { color: '#fff', width: 1 }
        },
        xbins: {
          size: binSize
        },
        hoverlabel: {
          bgcolor: "#1976d2",
          font: { color: "#fff", size: 14 }
        }
      }
    ];

    let height: number = 400;
    const containerWidth = this.meterCostHistogram.nativeElement.offsetWidth;

    var layout = {
      height: height,
      width: containerWidth,
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
