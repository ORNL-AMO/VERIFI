import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getConsumptionData, getUnitFromMeter } from '../meterDataQualityStatistics';

@Component({
  selector: 'app-meter-energy-histogram',
  standalone: false,
  templateUrl: './meter-energy-histogram.component.html',
  styleUrl: './meter-energy-histogram.component.css'
})
export class MeterEnergyHistogramComponent {

  @Input()
  meterData: Array<IdbUtilityMeterData>;
  @Input()
  selectedMeter: IdbUtilityMeter;

  viewInitialized: boolean = false;
  @ViewChild('meterEnergyHistogram', { static: false }) meterEnergyHistogram: ElementRef;
  meterDataToPlot: number[];
  unit: string;
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

  getDataAndUnit() {
    this.meterDataToPlot = getConsumptionData(this.meterData, this.selectedMeter);
    this.unit = getUnitFromMeter(this.selectedMeter, this.meterData);
  }

  drawChart() {
    this.getDataAndUnit();

    const min = Math.min(...this.meterDataToPlot);
    const max = Math.max(...this.meterDataToPlot);
    this.binSize = this.numberOfBins && this.numberOfBins > 1 ? (max - min) / (this.numberOfBins) : (max);
    this.binSize = Math.ceil(this.binSize)
    var data = [
      {
        type: "histogram",
        x: this.meterDataToPlot,
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
          text: `<b>Total Consumption (${this.unit})</b>`,
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
    this.plotlyService.newPlot(this.meterEnergyHistogram.nativeElement, data, layout, config);
  }
}

