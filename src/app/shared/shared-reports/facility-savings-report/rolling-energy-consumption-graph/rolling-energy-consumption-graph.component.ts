import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { trace } from 'console';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-rolling-energy-consumption-graph',
  standalone: false,

  templateUrl: './rolling-energy-consumption-graph.component.html',
  styleUrl: './rolling-energy-consumption-graph.component.css'
})
export class RollingEnergyConsumptionGraphComponent implements OnInit {
  @Input()
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  @Input()
  analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem;
  @Input()
  facilityOrAccount: IdbFacility | IdbAccount;
  @Input()
  inHomeScreen: boolean;

  @ViewChild('rollingEnergyConsumptionGraph', { static: false }) rollingEnergyConsumptionGraph: ElementRef;

  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() { 
    const skip = 12;
    let title = 'Trailing 12-Month Actual Energy Consumption';

    if (this.rollingEnergyConsumptionGraph) {

      let trace1Name: string = 'Trailing 12-month Actual Energy Consumption';
      let trace2Name: string = '15% Target';
      let trace3Name: string = '10% Target';
      let trace4Name: string = '5% Target';

      let yAxisTitle: string = this.analysisItem.energyUnit;
      let traceColor: string;
      if (this.analysisItem.analysisCategory == 'water') {
        trace1Name = 'Trailing 12-month Actual Water Consumption';
        yAxisTitle = this.analysisItem.waterUnit;
        traceColor = '#3498DB';
        title = 'Trailing 12-Month Actual Water Consumption';
      }


      var trace1 = {
        type: "scatter",
        mode: "lines+markers",
        name: trace1Name,
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.rollingActual }),
        line: { color: '#063970', width: 4 },
        marker: {
          size: 8
        }
      }

      var trace2 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.fifteenPercentTarget }),
        fillcolor: '#8e9f88',
        fill: 'tozeroy',
        line: { width: 0 },
        mode: 'lines',
        name: trace2Name,
      }

      var trace3 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.tenPercentTarget }),
        fillcolor: '#9cb491',
        fill: 'tonexty',
        line: { width: 0 },
        mode: 'lines',
        name: trace3Name,
      }

      var trace4 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.fivePercentTarget }),
        fillcolor: '#d5e3d0',
        fill: 'tonexty',
        line: { width: 0 },
        mode: 'lines',
        name: trace4Name,
      }

      var data = [trace2, trace3, trace4, trace1];

      let height: number;
      if (this.inHomeScreen) {
        height = 350;
      }

      var layout = {
        title: {
          text: title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        height: height,
        legend: {
          orientation: "h"
        },
        xaxis: {
          hoverformat: "%b, %y",
          tickformat: "%b %Y",
          automargin: true
        },
        yaxis: {
          title: {
            text: yAxisTitle,
            font: {
              size: 16
            },
            standoff: 18
          },
          automargin: true,
        },
        margin: { r: 0, t: 50 }
      };
      var config = {
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.rollingEnergyConsumptionGraph.nativeElement, data, layout, config);
    }
  }

  getPercentValue(value: number): string {
    return (value).toLocaleString(undefined, { maximumFractionDigits: 2, minimumIntegerDigits: 1 })
  }
}

