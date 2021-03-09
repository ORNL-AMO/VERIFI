import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { CalanderizedMeter } from 'src/app/models/calanderization';

@Component({
  selector: 'app-calanderization-chart',
  templateUrl: './calanderization-chart.component.html',
  styleUrls: ['./calanderization-chart.component.css']
})
export class CalanderizationChartComponent implements OnInit {
  @Input()
  meterData: CalanderizedMeter;
  @Input()
  displayGraphCost: boolean;
  @Input()
  displayGraphEnergy: boolean;
  @ViewChild('monthlyMeterDataBarChart', { static: false }) monthlyMeterDataBarChart: ElementRef;



  //Colors:

  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges() {
    this.drawChart();
  }

  drawChart() {
    if (this.monthlyMeterDataBarChart) {

      let traceData = new Array();

      let yAxisTitle: string;
      let yAxis2Title: string;

      let hoverformat: string;
      let tickSuffix: string;
      let tickPrefix: string;

      let hoverformat2: string;
      let tickSuffix2: string;
      let tickPrefix2: string;

      let yaxis: string = 'y';
      let offsetgroup: number = 1;

      if (this.displayGraphEnergy) {
        let yData: Array<number>;
        hoverformat = ',.0f'
        if (this.meterData.showConsumption) {
          tickSuffix = " " + this.meterData.consumptionUnit;
          yAxisTitle = 'Energy Consumption (' + this.meterData.consumptionUnit + ')';
          yData = this.meterData.monthlyData.map(data => { return data.energyConsumption })
        } else if (this.meterData.showEnergyUse) {
          tickSuffix = " " + this.meterData.energyUnit;
          yAxisTitle = 'Energy Consumption (' + this.meterData.energyUnit + ')';
          yData = this.meterData.monthlyData.map(data => { return data.energyUse });
        }
        traceData.push({
          x: this.meterData.monthlyData.map(data => { return data.date }),
          y: yData,
          name: 'Energy Consumption',
          type: 'bar',
          yaxis: yaxis,
          offsetgroup: offsetgroup,
          marker: {
            color: this.getMarkerColor(),
            line: { color: 'black' }
          }
        });
        yaxis = 'y2';
        offsetgroup = 2;
      }


      if (this.displayGraphCost) {
        if (!this.displayGraphEnergy) {
          tickPrefix = "$";
          hoverformat = ',.0f';
          yAxisTitle = 'Energy Cost';
        } else {
          tickPrefix2 = "$";
          hoverformat2 = ',.0f';
          yAxis2Title = 'Energy Cost';
        }

        traceData.push({
          x: this.meterData.monthlyData.map(data => { return data.date }),
          y: this.meterData.monthlyData.map(data => { return data.energyCost }),
          name: 'Energy Cost',
          type: 'bar',
          yaxis: yaxis,
          offsetgroup: offsetgroup,
          marker: {
            color: 'rgba(20, 90, 50,1)',
            line: { color: 'black' }
          }
        });
      }





      var layout = {
        legend: {
          orientation: "h"
        },
        // barmode: 'group',
        title: {
          text: this.meterData.meter.name,
          font: {
            size: 24
          },
        },
        xaxis: {
          // title: {
          //   text: xAxisTitle,
          //   font: {
          //     size: 18
          //   },
          // },
          hoverformat: "%b, %y"
        },
        yaxis: {
          title: {
            text: yAxisTitle,
            font: {
              size: 16
            },
            standoff: 18
          },
          hoverformat: hoverformat,
          ticksuffix: tickSuffix,
          tickprefix: tickPrefix,
          automargin: true
        },
        yaxis2: {
          title: {
            text: yAxis2Title,
            font: {
              size: 16
            },
            standoff: 18
          },
          hoverformat: hoverformat2,
          ticksuffix: tickSuffix2,
          tickprefix: tickPrefix2,
          automargin: true,
          overlaying: 'y',
          side: 'right',
          // anchor: 'x'
        },
        margin: { r: 0, t: 50 }
      };
      var config = { responsive: true };
      this.plotlyService.newPlot(this.monthlyMeterDataBarChart.nativeElement, traceData, layout, config);
    }
  }

  getMarkerColor(): string {
    if (this.meterData.meter.source == 'Electricity') {
      return 'rgba(127, 140, 141, 1)';
    } else if (this.meterData.meter.source == 'Natural Gas') {
      return 'rgba(176, 58, 46, 1)';
    } else if (this.meterData.meter.source == 'Other Fuels') {
      return 'rgba(165, 105, 189, 1)';
    } else if (this.meterData.meter.source == 'Water') {
      return 'rgba(41, 128, 185, 1)';
    } else if (this.meterData.meter.source == 'Waste Water') {
      return 'rgba(160, 64, 0, 1)';
    } else if (this.meterData.meter.source == 'Other Energy') {
      return 'rgba(23, 32, 42, 1)';
    } else if (this.meterData.meter.source == 'Other Utility') {
      return 'rgba(241, 196, 15, 1)';
    }
  }
}
