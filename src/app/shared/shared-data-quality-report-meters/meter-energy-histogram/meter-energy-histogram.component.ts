import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
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
    const unit = this.selectedMeter.startingUnit;
    var data = [
      {
        type: "histogram",
        x: this.meterData.map(data => { return data.totalEnergyUse }),
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
    const containerWidth = this.meterEnergyHistogram.nativeElement.offsetWidth;

    var layout = {
      height: height,
      width: containerWidth,
      autosize: true,
      plot_bgcolor: "#e7f1f2",
      paper_bgcolor: "#e7f1f2",
      xaxis: {
        title: {
          text: `<b>Energy Consumption (${unit})</b>`,
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

