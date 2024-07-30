import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-analysis-summary-savings-graph',
  templateUrl: './monthly-analysis-summary-savings-graph.component.html',
  styleUrls: ['./monthly-analysis-summary-savings-graph.component.css']
})
export class MonthlyAnalysisSummarySavingsGraphComponent {
  @Input()
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  @Input()
  analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem;
  @Input()
  facilityOrAccount: IdbFacility | IdbAccount;
  @Input()
  inHomeScreen: boolean;

  @ViewChild('monthlyAnalysisSavingsGraph', { static: false }) monthlyAnalysisSavingsGraph: ElementRef;


  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.monthlyAnalysisSavingsGraph) {

      var trace1 = {
        type: "bar",
        mode: "none",
        name: 'Savings',
        x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.map(results => {
          if (results.rolling12MonthImprovement >= 0) {
            return results.rolling12MonthImprovement
          } else {
            return 0;
          }
        }),
        marker: {
          color: '#58D68D'
        },
      }

      var trace2 = {
        type: "bar",
        mode: "none",
        name: 'Losses',
        x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.map(results => {
          if (results.rolling12MonthImprovement < 0) {
            return results.rolling12MonthImprovement
          } else {
            return undefined;
          }
        }),
        marker: {
          color: '#EC7063',
        },
      }

      //traces for filled area line chart
      // var trace1 = {
      //   type: "scatter",
      //   mode: "none",
      //   name: 'Savings',
      //   x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
      //   y: this.monthlyAnalysisSummaryData.map(results => {
      //     if (results.rolling12MonthImprovement >= 0) {
      //       return results.rolling12MonthImprovement
      //     } else {
      //       return 0;
      //     }
      //   }),
      //   line: { color: '#27AE60', width: 4 },
      //   fill: 'tozeroy',
      //   fillcolor: '#58D68D',
      //   marker: {
      //     // size: 8
      //   },
      //   stackgroup: 'one'
      // }

      // var trace2 = {
      //   type: "scatter",
      //   mode: "none",
      //   name: 'Losses',
      //   x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
      //   y: this.monthlyAnalysisSummaryData.map(results => {
      //     if (results.rolling12MonthImprovement < 0) {
      //       return results.rolling12MonthImprovement
      //     } else {
      //       return undefined;
      //     }
      //   }),
      //   line: { color: '#E74C3C', width: 4 },
      //   fill: 'tozeroy',
      //   fillcolor: '#EC7063',
      //   marker: {
      //     // size: 8
      //   },
      //   stackgroup: 'two'
      // }


      var data = [trace2, trace1];

      let height: number;
      if (this.inHomeScreen) {
        height = 350;
      }
      var layout = {
        height: height,
        barmode: 'stack',
        legend: {
          orientation: "h"
        },
        xaxis: {
          hoverformat: "%b, %y"
        },
        yaxis: {
          title: {
            text: 'Percent Savings',
            font: {
              size: 16
            },
            // standoff: 18
          },
          ticksuffix: '%',
          hoverformat: ",.1f",
          automargin: true,
        },
        margin: { r: 0, t: 50 }
      };
      var config = {
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.monthlyAnalysisSavingsGraph.nativeElement, data, layout, config);
    }
  }
}
