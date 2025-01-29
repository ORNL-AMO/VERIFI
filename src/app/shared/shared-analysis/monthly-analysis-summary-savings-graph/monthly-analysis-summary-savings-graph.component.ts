import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AnalysisGroup, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import * as _ from 'lodash';

@Component({
    selector: 'app-monthly-analysis-summary-savings-graph',
    templateUrl: './monthly-analysis-summary-savings-graph.component.html',
    styleUrls: ['./monthly-analysis-summary-savings-graph.component.css'],
    standalone: false
})
export class MonthlyAnalysisSummarySavingsGraphComponent {
  @Input({ required: true })
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  @Input({ required: true })
  analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem;
  @Input({ required: true })
  facilityOrAccount: IdbFacility | IdbAccount;
  @Input()
  inHomeScreen: boolean;
  @Input()
  group: AnalysisGroup;

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
      if (hasBanking && this.group) {
        this.drawChartBanking();
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
    let bankedResults: Array<MonthlyAnalysisSummaryData> = this.monthlyAnalysisSummaryData.filter(results => {
      return results.isBanked == true;
    })

    let latestBanked: MonthlyAnalysisSummaryData = _.maxBy(bankedResults, (results: MonthlyAnalysisSummaryData) => {
      return new Date(results.date);
    });
    console.log(latestBanked);

    var bankedSavings = {
      type: "bar",
      mode: "none",
      name: 'Banked Savings',
      x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
      y: this.monthlyAnalysisSummaryData.map(results => {
        if (results.isBanked && !results.isIntermediateBanked && results.rolling12MonthImprovement >= 0) {
          return results.rolling12MonthImprovement
        } else if (results.isIntermediateBanked && latestBanked.percentSavingsComparedToBaseline >= 0) {
          return latestBanked.percentSavingsComparedToBaseline;
        } else {
          return 0
        }
      }),
      marker: {
        color: '#2E86C1'
      },
    }

    var savings = {
      type: "bar",
      mode: "none",
      name: 'Savings',
      x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
      y: this.monthlyAnalysisSummaryData.map(results => {
        if (results.isBanked) {
          return 0
        } else if (results.rolling12MonthImprovement >= 0) {
          return results.rolling12MonthImprovement;
        } else {
          return 0;
        }
      }),
      marker: {
        color: '#58D68D'
      },
    }

    var bankedLosses = {
      type: "bar",
      mode: "none",
      name: 'Banked Losses',
      x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
      y: this.monthlyAnalysisSummaryData.map(results => {
        if (results.isBanked && results.rolling12MonthImprovement < 0) {
          return results.rolling12MonthImprovement
        } else if (results.rolling12MonthImprovement < 0) {
          return results.rolling12MonthImprovement;
        } else {
          return 0
        }
      }),
      marker: {
        color: '#EC7063'
      },
    }

    var losses = {
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


    var data = [bankedSavings, bankedLosses, savings, losses];

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
