import { Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { data } from 'browserslist';
import { get } from 'http';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

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
  @Input()
  binSize: number = 10;
  @Output()
  onBinSizeChange: EventEmitter<number> = new EventEmitter<number>();

  viewInitialized: boolean = false;
  @ViewChild('meterEnergyHistogram', { static: false }) meterEnergyHistogram: ElementRef;
  meterDataToPlot: number[];
  unit: string;
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

  getDataAndUnit() {
    if (this.selectedMeter.source === 'Electricity') {
      this.meterDataToPlot = this.meterData.map(data => { return data.totalEnergyUse });
      this.unit = this.selectedMeter.energyUnit;
    }
    if (this.selectedMeter.source !== 'Electricity' && (this.selectedMeter.scope == 5 || this.selectedMeter.scope == 6)) {
      this.meterDataToPlot = this.meterData.map(data => { return data.totalVolume }),
        this.unit = this.selectedMeter.startingUnit;
    }
    else if (this.selectedMeter.source !== 'Electricity' && this.selectedMeter.scope == 2) {
      this.meterDataToPlot = this.meterData.map(data => { return data.totalEnergyUse });
      this.unit = this.selectedMeter.energyUnit;
    }
    else if (this.selectedMeter.source != 'Electricity' && (this.selectedMeter.scope != 2 && this.selectedMeter.scope != 5 && this.selectedMeter.scope != 6)) {
      const allEnergyInvalid = this.meterData.every(data =>
        data.totalEnergyUse === 0 ||
        data.totalEnergyUse === undefined ||
        data.totalEnergyUse === null
      );
      if (allEnergyInvalid) {
        this.meterDataToPlot = this.meterData.map(data => data.totalVolume);
        this.unit = this.selectedMeter.startingUnit;
      } else {
        this.meterDataToPlot = this.meterData.map(data => data.totalEnergyUse);
        this.unit = this.selectedMeter.energyUnit;
      }
    }
  }

  drawChart() {
    this.getDataAndUnit();

    const min = Math.min(...this.meterDataToPlot);
    const max = Math.max(...this.meterDataToPlot);
    const binSize = (max - min) / this.numberOfBins;

    var data = [
      {
        type: "histogram",
        x: this.meterDataToPlot,
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
    const containerWidth = this.meterEnergyHistogram.nativeElement.offsetWidth;

    var layout = {
      height: height,
      width: containerWidth,
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

