import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

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
      let hasBanking: boolean = this.monthlyAnalysisSummaryData.find(result => {
        return result.isBanked;
      }) != undefined;
      if (hasBanking) {
        this.drawChartNoBanking();
      } else {
        this.drawChartNoBanking();
      }
    }
  }

  drawChartNoBanking() {
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

  drawChartBanking() {

    //TODO: Add banking to chart
    // var trace1Banked = {
    //   type: "bar",
    //   mode: "none",
    //   name: 'Banked Savings',
    //   x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
    //   y: this.monthlyAnalysisSummaryData.map(results => {
    //     if (results.rolling12MonthImprovementBanked >= 0) {
    //       return results.rolling12MonthImprovementBanked
    //     } else {
    //       return 0;
    //     }
    //   }),
    //   marker: {
    //     // color: '#58D68D'
    //   },
    // }

    // var trace2Banked = {
    //   type: "bar",
    //   mode: "none",
    //   name: 'Banked Losses',
    //   x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
    //   y: this.monthlyAnalysisSummaryData.map(results => {
    //     if (results.rolling12MonthImprovementBanked < 0) {
    //       return results.rolling12MonthImprovementBanked
    //     } else {
    //       return undefined;
    //     }
    //   }),
    //   marker: {
    //     // color: '#EC7063',
    //   },
    // }





    // var trace1 = {
    //   type: "bar",
    //   mode: "none",
    //   name: 'Savings',
    //   x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
    //   y: this.monthlyAnalysisSummaryData.map(results => {
    //     if (results.rolling12MonthImprovementUnbanked >= 0) {
    //       return results.rolling12MonthImprovementUnbanked
    //     } else {
    //       return 0;
    //     }
    //   }),
    //   marker: {
    //     color: '#58D68D'
    //   },
    // }

    // var trace2 = {
    //   type: "bar",
    //   mode: "none",
    //   name: 'Losses',
    //   x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
    //   y: this.monthlyAnalysisSummaryData.map(results => {
    //     if (results.rolling12MonthImprovementUnbanked < 0) {
    //       return results.rolling12MonthImprovementUnbanked
    //     } else {
    //       return undefined;
    //     }
    //   }),
    //   marker: {
    //     color: '#EC7063',
    //   },
    // }


    // var data = [trace2Banked, trace1Banked, trace2, trace1];

    // let height: number;
    // if (this.inHomeScreen) {
    //   height = 350;
    // }
    // var layout = {
    //   height: height,
    //   barmode: 'stack',
    //   legend: {
    //     orientation: "h"
    //   },
    //   xaxis: {
    //     hoverformat: "%b, %y"
    //   },
    //   yaxis: {
    //     title: {
    //       text: 'Percent Savings',
    //       font: {
    //         size: 16
    //       },
    //       // standoff: 18
    //     },
    //     ticksuffix: '%',
    //     hoverformat: ",.1f",
    //     automargin: true,
    //   },
    //   margin: { r: 0, t: 50 }
    // };
    // var config = {
    //   displaylogo: false,
    //   responsive: true
    // };
    // this.plotlyService.newPlot(this.monthlyAnalysisSavingsGraph.nativeElement, data, layout, config);
  }
}
