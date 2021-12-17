import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import * as _ from 'lodash';
@Component({
  selector: 'app-calanderization-chart',
  templateUrl: './calanderization-chart.component.html',
  styleUrls: ['./calanderization-chart.component.css']
})
export class CalanderizationChartComponent implements OnInit {
  @Input()
  meterData: CalanderizedMeter;
  @Input()
  displayGraphCost: "bar" | "scatter" | null;
  @Input()
  displayGraphEnergy: "bar" | "scatter" | null;

  @ViewChild('monthlyMeterDataChart', { static: false }) monthlyMeterDataChart: ElementRef;

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
    if (this.monthlyMeterDataChart) {
      let traceData = new Array();
      let yAxisTitle: string;
      let yAxis2Title: string;
      let hoverformat: string;
      // let tickSuffix: string;
      // let tickPrefix: string;
      let hoverformat2: string;
      // let tickSuffix2: string;
      // let tickPrefix2: string;
      let yaxis: string = 'y';
      let offsetgroup: number = 1;
      let costLine: {width: number};
      let energyLine: {width: number};
      let y1overlay: string;
      let y2overlay: string = 'y';

      let yAxisDtick: number;
      let yAxis2Dtick: number;

      if(this.displayGraphCost == 'scatter'){
        costLine = { width: 5  }
      }

      if(this.displayGraphEnergy == 'scatter'){
        energyLine = { width: 5 }

      }

      if(this.displayGraphEnergy == 'scatter' && this.displayGraphCost == 'bar'){
        y2overlay = undefined;
        y1overlay = 'y2';
      }


      if (this.displayGraphEnergy) {
        let yData: Array<number>;
        hoverformat = ',.0f'
        if (this.meterData.showConsumption) {
          // tickSuffix = " " + this.meterData.consumptionUnit;
          yAxisTitle = 'Utility Consumption (' + this.meterData.consumptionUnit + ')';
          yData = this.meterData.monthlyData.map(data => { return data.energyConsumption })
        } else if (this.meterData.showEnergyUse) {
          // tickSuffix = " " + this.meterData.energyUnit;
          yAxisTitle = 'Utility Consumption (' + this.meterData.consumptionUnit + ')';
          yData = this.meterData.monthlyData.map(data => { return data.energyUse });
        }
        // let min: number = _.min(yData);
        let max: number = _.max(yData);
        // let diff: number = max - min;
        yAxisDtick = max / 5;
        traceData.push({
          x: this.meterData.monthlyData.map(data => { return data.date }),
          y: yData,
          name: 'Utility Consumption',
          type: this.displayGraphEnergy,
          yaxis: yaxis,
          offsetgroup: offsetgroup,
          // marker: {
          //   color: this.getMarkerColor(),
          // },
          line: energyLine
        });
        yaxis = 'y2';
        offsetgroup = 2;
      }


      if (this.displayGraphCost) {
        let yData: Array<number> = this.meterData.monthlyData.map(data => { return data.energyCost });
        // let min: number = _.min(yData);
        let max: number = _.max(yData);
        // let diff: number = max - min;

        if (!this.displayGraphEnergy) {
          // tickPrefix = "$";
          hoverformat = '$,.0f';
          yAxisTitle = 'Utility Cost';
          yAxisDtick = max / 5;
        } else {
          // tickPrefix2 = "$";
          hoverformat2 = '$,.0f';
          yAxis2Title = 'Utility Cost';
          yAxis2Dtick = max / 5;
        }

        traceData.push({
          x: this.meterData.monthlyData.map(data => { return data.date }),
          y: yData,
          name: 'Utility Cost',
          type: this.displayGraphCost,
          yaxis: yaxis,
          offsetgroup: offsetgroup,
          line: costLine
        });
      }

      var layout = {
        legend: {
          orientation: "h"
        },
        title: {
          text: this.meterData.meter.name,
          font: {
            size: 18
          },
        },
        xaxis: {
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
          // ticksuffix: tickSuffix,
          // tickprefix: tickPrefix,
          automargin: true,
          overlaying: y1overlay,
          dtick: yAxisDtick,
          rangemode: 'tozero'
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
          // ticksuffix: tickSuffix2,
          // tickprefix: tickPrefix2,
          automargin: true,
          overlaying: y2overlay,
          side: 'right',
          dtick: yAxis2Dtick,
          rangemode: 'tozero'
        },
        margin: { r: 0, t: 50 }
      };
      var config = { 
        responsive: true,
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
      };
      this.plotlyService.newPlot(this.monthlyMeterDataChart.nativeElement, traceData, layout, config);
    }
  }
}
