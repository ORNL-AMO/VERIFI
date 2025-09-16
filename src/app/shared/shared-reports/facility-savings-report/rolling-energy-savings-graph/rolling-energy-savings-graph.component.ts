import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { max } from 'rxjs';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-rolling-energy-savings-graph',
  standalone: false,

  templateUrl: './rolling-energy-savings-graph.component.html',
  styleUrl: './rolling-energy-savings-graph.component.css'
})
export class RollingEnergySavingsGraphComponent {
  @Input()
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  @Input()
  analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem;
  @Input()
  facilityOrAccount: IdbFacility | IdbAccount;
  @Input()
  inHomeScreen: boolean;

  @ViewChild('rollingEnergySavingsGraph', { static: false }) rollingEnergySavingsGraph: ElementRef;

  constructor(private plotlyService: PlotlyService) { }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    const skip = 12;
    let title = 'Trailing 12-Month Actual Energy Savings';

    const fivePercentLowerBound = this.monthlyAnalysisSummaryData.map(results => results.fivePercentSavings);
    const fivePercentUpperBound = this.monthlyAnalysisSummaryData.map(results => results.tenPercentSavings);
    const tenPercentUpperBound = this.monthlyAnalysisSummaryData.map(results => results.fifteenPercentSavings);
    const fifteenPercentUpperBound = this.monthlyAnalysisSummaryData.map(results => results.twentyPercentSavings);
    const twentyPercentUpperBound = this.monthlyAnalysisSummaryData.map(results => results.twentyFivePercentSavings);
    const thirtyPercentTarget = this.monthlyAnalysisSummaryData.map(results => results.thirtyPercentSavings);
    const rollingSavingsForComparison = this.monthlyAnalysisSummaryData.map(results => results.rollingSavings * 1.3);
    const combinedArray = [...thirtyPercentTarget, ...rollingSavingsForComparison];
    const maxTarget = Math.max(...combinedArray);
    const twentyFivePercentUpperBound = new Array(this.monthlyAnalysisSummaryData.length).fill(maxTarget);

    if (this.rollingEnergySavingsGraph) {

      let trace1Name: string = 'Trailing 12-month Actual Energy Savings';
      let trace2Name: string = '5% Target';
      let trace3Name: string = '10% Target';
      let trace4Name: string = '15% Target';
      let trace5Name: string = '20% Target';
      let trace6Name: string = '25% Target';

      let yAxisTitle: string = this.analysisItem.energyUnit;
      let traceColor: string;
      if (this.analysisItem.analysisCategory == 'water') {
        trace1Name = 'Trailing 12-month Actual Water Savings';
        yAxisTitle = this.analysisItem.waterUnit;
        traceColor = '#3498DB';
        title = 'Trailing 12-Month Actual Water Savings';
      }

      var trace1 = {
        type: "scatter",
        mode: "lines+markers",
        name: trace1Name,
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.rollingSavings }),
        line: { color: '#063970', width: 4 },
        marker: {
          size: 8
        }
      }

      var trace2lb = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: fivePercentLowerBound.slice(skip),
        fill: 'none',
        line: { color: 'rgba(0, 0, 0, 0)' },
        mode: 'lines',
        showlegend: false,
        name: '',
        hoverinfo: 'skip'
      }

      var trace2 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: fivePercentUpperBound.slice(skip),
        fillcolor: 'rgba(226, 232, 240, 0.6)',
        fill: 'tonexty',
        line: { width: 0 },
        mode: 'lines',
        name: trace2Name,
      }

      var trace3lb = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: fivePercentUpperBound.slice(skip),
        fill: 'none',
        line: { color: 'rgba(0, 0, 0, 0)' },
        mode: 'lines',
        showlegend: false,
        name: '',
        hoverinfo: 'skip'
      }

      var trace3 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: tenPercentUpperBound.slice(skip),
        fillcolor: 'rgba(192, 203, 224, 0.6)',
        fill: 'tonexty',
        line: { width: 0 },
        mode: 'lines',
        name: trace3Name,
      }

      var trace4lb = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: tenPercentUpperBound.slice(skip),
        fill: 'none',
        line: { color: 'rgba(0, 0, 0, 0)' },
        mode: 'lines',
        showlegend: false,
        name: '',
        hoverinfo: 'skip'
      }

      var trace4 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: fifteenPercentUpperBound.slice(skip),
        fillcolor: 'rgba(154, 170, 204, 0.6)',
        fill: 'tonexty',
        line: { width: 0 },
        mode: 'lines',
        name: trace4Name,
      }

      var trace5lb = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: fifteenPercentUpperBound.slice(skip),
        fill: 'none',
        line: { color: 'rgba(0, 0, 0, 0)' },
        mode: 'lines',
        showlegend: false,
        name: '',
        hoverinfo: 'skip'
      }

      var trace5 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: twentyPercentUpperBound.slice(skip),
        fillcolor: 'rgba(122, 139, 181, 0.6)',
        fill: 'tonexty',
        line: { width: 0 },
        mode: 'lines',
        name: trace5Name,
      }

      var trace6lb = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: twentyPercentUpperBound.slice(skip),
        fill: 'none',
        line: { color: 'rgba(0, 0, 0, 0)' },
        mode: 'lines',
        showlegend: false,
        name: '',
        hoverinfo: 'skip'
      }

      var trace6 = {
        x: this.monthlyAnalysisSummaryData.slice(skip).map(results => { return results.date }),
        y: twentyFivePercentUpperBound.slice(skip),
        fillcolor: 'rgba(90, 109, 153, 0.6)',
        fill: 'tonexty',
        line: { width: 0 },
        mode: 'lines',
        name: trace6Name,
      }

      var data = [trace2lb, trace2, trace3lb, trace3, trace4lb, trace4, trace5lb, trace5, trace6lb, trace6, trace1];

      let height: number;
      if (this.inHomeScreen) {
        height = 350;
      }

      const xVals = this.monthlyAnalysisSummaryData.slice(skip).map(results => results.date);
      const lastIndex = xVals.length - 1;
      const lastX = xVals[lastIndex];
      const lastData = this.monthlyAnalysisSummaryData.slice(skip)[lastIndex];
      const annotations = [];

      if (!isNaN((twentyFivePercentUpperBound[lastIndex] + lastData.twentyFivePercentSavings) / 2)) {
        annotations.push({
          x: lastX,
          y: (twentyFivePercentUpperBound[lastIndex] + lastData.twentyFivePercentSavings) / 2,
          xref: 'x',
          yref: 'y',
          text: '25% Target',
          showarrow: false,
          font: { size: 12 },
          align: 'left',
          xanchor: 'left',
          xshift: 10
        });
      }

      annotations.push({
        x: lastX,
        y: (lastData.twentyPercentSavings + lastData.twentyFivePercentSavings) / 2,
        xref: 'x',
        yref: 'y',
        text: '20% Target',
        showarrow: false,
        font: { size: 12 },
        align: 'left',
        xanchor: 'left',
        xshift: 10
      });

      annotations.push({
        x: lastX,
        y: (lastData.fifteenPercentSavings + lastData.twentyPercentSavings) / 2,
        xref: 'x',
        yref: 'y',
        text: '15% Target',
        showarrow: false,
        font: { size: 12 },
        align: 'left',
        xanchor: 'left',
        xshift: 10
      });

      annotations.push({
        x: lastX,
        y: (lastData.tenPercentSavings + lastData.fifteenPercentSavings) / 2,
        xref: 'x',
        yref: 'y',
        text: '10% Target',
        showarrow: false,
        font: { size: 12 },
        align: 'left',
        xanchor: 'left',
        xshift: 10
      });

      annotations.push({
        x: lastX,
        y: (lastData.fivePercentSavings + lastData.tenPercentSavings) / 2,
        xref: 'x',
        yref: 'y',
        text: '5% Target',
        showarrow: false,
        font: { size: 12 },
        align: 'left',
        xanchor: 'left',
        xshift: 10
      });

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
          automargin: true,
          showgrid: true
        },
        yaxis: {
          title: {
            text: yAxisTitle,
            font: {
              size: 16
            },
            standoff: 18,
          },
          showgrid: true,
          automargin: true,
        },
        margin: { r: 0, t: 50 },
        annotations: annotations
      };
      var config = {
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.rollingEnergySavingsGraph.nativeElement, data, layout, config);
    }
  }

  getPercentValue(value: number): string {
    return (value).toLocaleString(undefined, { maximumFractionDigits: 2, minimumIntegerDigits: 1 })
  }
}

