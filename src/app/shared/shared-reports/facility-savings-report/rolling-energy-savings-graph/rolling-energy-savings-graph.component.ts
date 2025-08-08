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
      let title = 'Trailing 12-Month Actual Energy Savings';

      const fivePercentLowerBound = this.monthlyAnalysisSummaryData.map(results => results.fivePercentSavings);
      const fivePercentUpperBound = this.monthlyAnalysisSummaryData.map(results => results.tenPercentSavings);
      const tenPercentUpperBound = this.monthlyAnalysisSummaryData.map(results => results.fifteenPercentSavings);
      const thirtyPercentTarget = this.monthlyAnalysisSummaryData.map(results => results.thirtyPercentSavings);
      const rollingSavingsForComparison = this.monthlyAnalysisSummaryData.map(results => results.rollingSavings * 1.3);
      const combinedArray = [...thirtyPercentTarget, ...rollingSavingsForComparison];
      const maxTarget = Math.max(...combinedArray);
      const fifteenPercentUpperBound = new Array(this.monthlyAnalysisSummaryData.length).fill(maxTarget);
      //const fifteenPercentUpperBound = thirtyPercentTarget > rollingSavingsForComparison ? thirtyPercentTarget : rollingSavingsForComparison;

      if (this.rollingEnergySavingsGraph) {

        let trace1Name: string = 'Trailing 12-month Actual Energy Savings';
        let trace2Name: string = '5% Target';
        let trace3Name: string = '10% Target';
        let trace4Name: string = '15% Target';

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
          x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
          y: this.monthlyAnalysisSummaryData.map(results => { return results.rollingSavings }),
          line: { color: '#063970', width: 4 },
          marker: {
            size: 8
          }
        }
  
        var trace2lb = {
          x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
          y: fivePercentLowerBound,
          fill: 'none',
          line: { color: 'rgba(0, 0, 0, 0)' },
          mode: 'lines',
          showlegend: false,
          name: '',
          hoverinfo: 'skip'
        }

        var trace2 = {
          x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
          y: fivePercentUpperBound,
          fillcolor: '#d2d9e8',
          fill: 'tonexty',
          line: { width: 0 },
          mode: 'lines',
          name: trace2Name,
        }

         var trace3lb = {
          x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
          y: fivePercentUpperBound,
          fill: 'none',
          line: { color: 'rgba(0, 0, 0, 0)' },
          mode: 'lines',
          showlegend: false,
          name: '',
          hoverinfo: 'skip'
        }

        var trace3 = {
          x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
          y: tenPercentUpperBound,
          fillcolor: '#a5b3d0',
          fill: 'tonexty',
          line: { width: 0 },
          mode: 'lines',
          name: trace3Name,
        }

        var trace4lb = {
          x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
          y: tenPercentUpperBound,
          fill: 'none',
          line: { color: 'rgba(0, 0, 0, 0)' },
          mode: 'lines',
          showlegend: false,
          name: '',
          hoverinfo: 'skip'
        }

        var trace4 = {
          x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
          y: fifteenPercentUpperBound,
          fillcolor: '#687faa',
          fill: 'tonexty',
          line: { width: 0 },
          mode: 'lines',
          name: trace4Name,
        }
  
        var data = [trace2lb, trace2, trace3lb, trace3, trace4lb, trace4, trace1];
  
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
          margin: { r: 0, t: 50 }
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
  
  