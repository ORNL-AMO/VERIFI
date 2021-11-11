import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { MeterGroupType } from 'src/app/models/calanderization';
import { IdbUtilityMeterGroup } from 'src/app/models/idb';

@Component({
  selector: 'app-meter-group-chart',
  templateUrl: './meter-group-chart.component.html',
  styleUrls: ['./meter-group-chart.component.css']
})
export class MeterGroupChartComponent implements OnInit {
  @Input()
  meterGroupType: MeterGroupType;
  @Input()
  meterGroup: IdbUtilityMeterGroup;
  @Input()
  displayGraphCost: "bar" | "scatter" | null;
  @Input()
  displayGraphEnergy: "bar" | "scatter" | null;
  @Input()
  energyUnit: string;
  @Input()
  waterUnit: string;

  @ViewChild('meterGroupingChart', { static: false }) meterGroupingChart: ElementRef;

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
    if (this.meterGroupingChart && this.meterGroup.combinedMonthlyData && this.meterGroup.combinedMonthlyData.length != 0) {
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
      let costLine: { width: number };
      let energyLine: { width: number };
      let y1overlay: string;
      let y2overlay: string = 'y';

      if (this.displayGraphCost == 'scatter') {
        costLine = { width: 5 }
      }

      if (this.displayGraphEnergy == 'scatter') {
        energyLine = { width: 5 }

      }

      if (this.displayGraphEnergy == 'scatter' && this.displayGraphCost == 'bar') {
        y2overlay = undefined;
        y1overlay = 'y2';
      }


      if (this.displayGraphEnergy) {
        let yData: Array<number>;
        hoverformat = ',.0f'
        if (this.meterGroupType.groupType == 'Water' || this.meterGroupType.groupType == 'Other') {
          yData = this.meterGroup.combinedMonthlyData.map(data => { return data.energyConsumption })
          if (this.meterGroupType.groupType == 'Water') {
            yAxisTitle = 'Utility Consumption (' + this.waterUnit + ')';
          } else {
            yAxisTitle = 'Utility Consumption';
          }
        } else {
          // tickSuffix = " " + this.meterData.energyUnit;
          yAxisTitle = 'Utility Consumption (' + this.energyUnit + ')';
          yData = this.meterGroup.combinedMonthlyData.map(data => { return data.energyUse });
        }
        traceData.push({
          x: this.meterGroup.combinedMonthlyData.map(data => { return data.date }),
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
        if (!this.displayGraphEnergy) {
          // tickPrefix = "$";
          hoverformat = '$,.0f';
          yAxisTitle = 'Utility Cost';
        } else {
          // tickPrefix2 = "$";
          hoverformat2 = '$,.0f';
          yAxis2Title = 'Utility Cost';
        }

        traceData.push({
          x: this.meterGroup.combinedMonthlyData.map(data => { return data.date }),
          y: this.meterGroup.combinedMonthlyData.map(data => { return data.energyCost }),
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
          text: this.meterGroup.name,
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
          overlaying: y1overlay
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
        },
        margin: { r: 0, t: 50 }
      };
      var config = { responsive: true };
      this.plotlyService.newPlot(this.meterGroupingChart.nativeElement, traceData, layout, config);
    }
  }

}
