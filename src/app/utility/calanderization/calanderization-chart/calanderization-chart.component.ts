import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
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
  graphDataType: "cost" | "energy";

  @ViewChild('monthlyMeterDataBarChart', { static: false }) monthlyMeterDataBarChart: ElementRef;

  noData: boolean;
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

      let yAxisTitle: string;
      let yData: Array<number>;

      let hoverformat: string;
      let tickSuffix: string;
      let tickPrefix: string;
      if (this.graphDataType == 'energy') {
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
      } else {
        tickPrefix = "$";
        hoverformat = ',.0f';
        yAxisTitle = 'Energy Cost';
        yData = this.meterData.monthlyData.map(data => { return data.energyCost })
      }


      let traceData = [{
        x: this.meterData.monthlyData.map(data => { return data.date }),
        y: yData,
        name: 'Energy Consumption',
        type: 'bar'
      }];


      var layout = {
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
        margin: { r: 0, t: 50 }
      };
      var config = { responsive: true };
      if (!this.noData) {
        this.plotlyService.newPlot(this.monthlyMeterDataBarChart.nativeElement, traceData, layout, config);
      }
    }
  }

}
