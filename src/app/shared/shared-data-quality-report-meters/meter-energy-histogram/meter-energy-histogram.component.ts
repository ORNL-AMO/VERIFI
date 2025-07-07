import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
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
  viewInitialized: boolean = false;
  @ViewChild('meterEnergyHistogram', { static: false }) meterEnergyHistogram: ElementRef;

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
    var data = [
      {
        type: "histogram",
        x: this.meterData.map(data => { return data.totalEnergyUse }),
        marker: { color: '#7F7F7F' },
        xbins: {
          size: 10000
        }
      }
    ];

    let height: number = 400;
    const containerWidth = this.meterEnergyHistogram.nativeElement.offsetWidth;

    var layout = {
      height: height,
      width: containerWidth,
      autosize: true,
      xaxis: {
        title: {
          text: 'Energy Consumption (kWh)',
          font: {
            size: 16
          },
          standoff: 18
        },
        automargin: true,
      },
      bargap: 0.05
    };
    var config = {
      displaylogo: false,
      responsive: true
    };
    this.plotlyService.newPlot(this.meterEnergyHistogram.nativeElement, data, layout, config);
  }
}

