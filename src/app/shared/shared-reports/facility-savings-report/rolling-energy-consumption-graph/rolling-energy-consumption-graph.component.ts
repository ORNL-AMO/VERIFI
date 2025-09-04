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
      let trace5Name: string = '20% Target';
      let trace6Name: string = '25% Target';

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

      var trace6 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.twentyFivePercentTarget }),
        fillcolor: 'rgba(109, 160, 109, 0.3)',
        fill: 'tozeroy',
        line: { width: 0 },
        mode: 'lines',
        name: trace6Name,
      }

      var trace5 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.twentyPercentTarget }),
        fillcolor: 'rgba(138, 188, 138, 0.3)',
        fill: 'tozeroy',
        line: { width: 0 },
        mode: 'lines',
        name: trace5Name,
      }

      var trace2 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.fifteenPercentTarget }),
        fillcolor: 'rgba(169, 211, 169, 0.6)',
        fill: 'tozeroy',
        line: { width: 0 },
        mode: 'lines',
        name: trace2Name,
      }

      var trace3 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.tenPercentTarget }),
        fillcolor: 'rgba(198, 226, 198, 0.6)',
        fill: 'tonexty',
        line: { width: 0 },
        mode: 'lines',
        name: trace3Name,
      }

      var trace4 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.fivePercentTarget }),

        fillcolor: 'rgba(224, 242, 224, 0.6)',
        fill: 'tonexty',
        line: { width: 0 },
        mode: 'lines',
        name: trace4Name,
      }

      var data = [trace6, trace5, trace2, trace3, trace4, trace1];

      let height: number;
      if (this.inHomeScreen) {
        height = 350;
      }

      const xVals = this.monthlyAnalysisSummaryData.slice(skip).map(results => results.date);
      const lastIndex = xVals.length - 1;
      const lastX = xVals[lastIndex];
      const lastData = this.monthlyAnalysisSummaryData.slice(skip)[lastIndex];

      var layout = {
        title: {
          text: title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        height: height,
        showlegend: false,
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
        margin: { r: 0, t: 50 },
        annotations: [
          {
            x: lastX,
            y: (lastData.twentyFivePercentTarget + 0) / 2,
            xref: 'x',
            yref: 'y',
            text: '25% Target',
            showarrow: false,
            font: { size: 12 },
            align: 'left',
            xanchor: 'left',
            xshift: 10
          },
          {
            x: lastX,
            y: (lastData.twentyPercentTarget + lastData.twentyFivePercentTarget) / 2,
            xref: 'x',
            yref: 'y',
            text: '20% Target',
            showarrow: false,
            font: { size: 12 },
            align: 'left',
            xanchor: 'left',
            xshift: 10
          },
          {
            x: lastX,
            y: (lastData.fifteenPercentTarget + lastData.twentyPercentTarget) / 2,
            xref: 'x',
            yref: 'y',
            text: '15% Target',
            showarrow: false,
            font: { size: 12 },
            align: 'left',
            xanchor: 'left',
            xshift: 10
          },
          {
            x: lastX,
            y: (lastData.fifteenPercentTarget + lastData.tenPercentTarget) / 2,
            xref: 'x',
            yref: 'y',
            text: '10% Target',
            showarrow: false,
            font: { size: 12 },
            align: 'left',
            xanchor: 'left',
            xshift: 10
          },
          {
            x: lastX,
            y: (lastData.tenPercentTarget + lastData.fivePercentTarget) / 2,
            xref: 'x',
            yref: 'y',
            text: '5% Target',
            showarrow: false,
            font: { size: 12 },
            align: 'left',
            xanchor: 'left',
            xshift: 10
          }
        ]
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

