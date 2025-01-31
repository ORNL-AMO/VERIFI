import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import * as _ from 'lodash';

@Component({
  selector: 'app-sep-report-graphs',
  templateUrl: './sep-report-graphs.component.html',
  styleUrl: './sep-report-graphs.component.css',
  standalone: false
})
export class SepReportGraphsComponent {
  @Input({ required: true })
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;



  @ViewChild('senpiGraph', { static: false }) senpiGraph: ElementRef;
  @ViewChild('rollingSavingsGraph', { static: false }) rollingSavingsGraph: ElementRef;
  @ViewChild('rollingConsumptionGraph', { static: false }) rollingConsumptionGraph: ElementRef;


  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawSenpiGraph();
    this.drawRollingConsumptionGraph();
    this.drawRollingSavingsGraph();
  }

  drawSenpiGraph() {
    if (this.senpiGraph) {

      let filteredData: Array<MonthlyAnalysisSummaryData> = this.monthlyAnalysisSummaryData.filter(data => {
        return data.fiscalYear != this.analysisItem.baselineYear;
      })

      var trace1 = {
        type: "scatter",
        mode: "lines+markers",
        name: 'Trailing 12-month SEnPI',
        x: filteredData.map(results => { return results.date }),
        y: filteredData.map(results => { return results.SEnPI }),
        line: { color: '#f4d03f', width: 4 },
        marker: {
          size: 8
        }
      }

      var data = [trace1];

      // let height: number;

      var layout = {
        // title: {
        //   text: title,
        //   font: {
        //     size: 18
        //   },
        // },
        // height: height,
        legend: {
          orientation: "h"
        },
        xaxis: {
          hoverformat: "%b, %y",
        },
        yaxis: {
          title: {
            text: 'SEnPI',
            font: {
              size: 16
            },
            standoff: 18
          },
          automargin: true,
          range: [0.25, 1.5]
        },
        margin: { r: 0, t: 50 }
      };
      var config = {
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.senpiGraph.nativeElement, data, layout, config);
    }
  }


  drawRollingConsumptionGraph() {
    if (this.rollingConsumptionGraph) {

      let rollingSavings: Array<{
        date: Date,
        actualEnergyUse: number,
        rollingSavings: number,
        fivePercentEnergy: number,
        tenPercentEnergy: number,
        fifteenPercentEnergy: number,
        fivePercentSavings: number,
        tenPercentSavings: number,
        fifteenPercentSavings: number
      }> = this.getRollingSavingsTargetValues();

      var trace1 = {
        type: "scatter",
        mode: "lines+markers",
        name: 'Trailing 12-month Actual Energy Savings',
        x: rollingSavings.map(results => { return results.date }),
        y: rollingSavings.map(results => { return results.rollingSavings }),
        line: { color: '#0079c2', width: 4 },
        marker: {
          size: 8
        }
      }

      var trace2 = {
        type: "scatter",
        fill: 'tonexty',
        fillcolor: 'rgba(29, 66, 138, .2)',
        mode: "none",
        name: '5% Target',
        x: rollingSavings.map(results => { return results.date }),
        y: rollingSavings.map(results => { return results.fivePercentSavings }),
        line: { color: '#fff', width: 4 },
        marker: {
          size: 8
        }
      }
      var trace3 = {
        type: "scatter",
        mode: "none",
        fill: 'tonexty',
        fillcolor: 'rgba(29, 66, 138, .4)',
        name: '10% Target',
        x: rollingSavings.map(results => { return results.date }),
        y: rollingSavings.map(results => { return results.tenPercentSavings }),
        line: { color: '#196f3d', width: 4 },
        marker: {
          size: 8
        }
      }
      var trace4 = {
        type: "scatter",
        mode: "none",
        fillcolor: 'rgba(29, 66, 138, .6)',
        name: '15% Target',
        fill: 'tonexty',
        x: rollingSavings.map(results => { return results.date }),
        y: rollingSavings.map(results => { return results.fifteenPercentSavings }),
        line: { color: '#7dcea0', width: 4 },
        marker: {
          size: 8
        }
      }

      let yData: Array<number> = [];
      rollingSavings.forEach(data => {
        yData.push(data.rollingSavings);
        yData.push(data.fivePercentSavings);
        yData.push(data.fifteenPercentSavings);
      });
      let maxY: number = _.max(yData);
      let minY: number = _.min(yData);


      var trace5 = {
        type: "scatter",
        mode: "none",
        fillcolor: 'rgba(0, 0, 0, 0)',
        showlegend: false,
        name: '15% Target',
        fill: 'tozeroy',
        x: rollingSavings.map(results => { return results.date }),
        y: rollingSavings.map(results => { return maxY * 10 }),
        line: { color: '#7dcea0', width: 4 },
        marker: {
          size: 8
        }
      }


      var data = [trace5, trace4, trace3, trace2, trace1];



      var layout = {
        legend: {
          orientation: "h"
        },
        xaxis: {
          hoverformat: "%b, %y",
        },
        yaxis: {
          title: {
            text: 'MMBtu',
            font: {
              size: 16
            },
            standoff: 18
          },
          automargin: true,
          range: [0, maxY * 1.3]
        },
        margin: { r: 0, t: 50 }
      };
      var config = {
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.rollingConsumptionGraph.nativeElement, data, layout, config);
    }
  }



  drawRollingSavingsGraph() {
    if (this.rollingSavingsGraph) {

      let rollingSavings: Array<{
        date: Date,
        actualEnergyUse: number,
        fivePercentEnergy: number,
        tenPercentEnergy: number,
        fifteenPercentEnergy: number,
        fivePercentSavings: number,
        tenPercentSavings: number,
        fifteenPercentSavings: number
      }> = this.getRollingSavingsTargetValues();

      var trace1 = {
        type: "scatter",
        mode: "lines+markers",
        name: 'Trailing 12-month Actual Energy Savings',
        x: rollingSavings.map(results => { return results.date }),
        y: rollingSavings.map(results => { return results.actualEnergyUse }),
        line: { color: '#0079c2', width: 4 },
        marker: {
          size: 8
        }
      }

      var trace2 = {
        type: "scatter",
        fill: 'tozeroy',
        fillcolor: 'rgba(0, 122, 62, .2)',
        mode: "none",
        name: '5% Target',
        x: rollingSavings.map(results => { return results.date }),
        y: rollingSavings.map(results => { return results.fivePercentEnergy }),
        line: { color: '#27ae60', width: 4 },
        marker: {
          size: 8
        }
      }
      var trace3 = {
        type: "scatter",
        mode: "none",
        fill: 'tozeroy',
        fillcolor: 'rgba(0, 122, 62, .3)',
        name: '10% Target',
        x: rollingSavings.map(results => { return results.date }),
        y: rollingSavings.map(results => { return results.tenPercentEnergy }),
        line: { color: '#196f3d', width: 4 },
        marker: {
          size: 8
        }
      }
      var trace4 = {
        type: "scatter",
        mode: "none",
        fillcolor: 'rgba(0, 122, 62, .4)',
        name: '15% Target',
        fill: 'tozeroy',
        x: rollingSavings.map(results => { return results.date }),
        y: rollingSavings.map(results => { return results.fifteenPercentEnergy }),
        line: { color: '#7dcea0', width: 4 },
        marker: {
          size: 8
        }
      }

      var data = [trace2, trace3, trace4, trace1];


      let yData: Array<number> = [];
      rollingSavings.forEach(data => {
        yData.push(data.actualEnergyUse);
        yData.push(data.fivePercentEnergy);
        yData.push(data.fifteenPercentEnergy);
      });
      let maxY: number = _.max(yData);
      let minY: number = _.min(yData);

      var layout = {
        legend: {
          orientation: "h"
        },
        xaxis: {
          hoverformat: "%b, %y",
        },
        yaxis: {
          title: {
            text: 'MMBtu',
            font: {
              size: 16
            },
            standoff: 18
          },
          automargin: true,
          range: [minY * .9, maxY * 1.1]
        },
        margin: { r: 0, t: 50 }
      };
      var config = {
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.rollingSavingsGraph.nativeElement, data, layout, config);
    }
  }


  getRollingSavingsTargetValues(): Array<{
    date: Date,
    actualEnergyUse: number,
    rollingSavings: number,
    fivePercentEnergy: number,
    tenPercentEnergy: number,
    fifteenPercentEnergy: number,
    fivePercentSavings: number,
    tenPercentSavings: number,
    fifteenPercentSavings: number
  }> {
    let results: Array<{
      date: Date,
      rollingSavings: number,
      actualEnergyUse: number,
      fivePercentEnergy: number,
      tenPercentEnergy: number,
      fifteenPercentEnergy: number,
      fivePercentSavings: number,
      tenPercentSavings: number,
      fifteenPercentSavings: number
    }> = new Array();

    for (let i = 0; i < this.monthlyAnalysisSummaryData.length; i++) {
      if (i > 11) {
        let dataSlice: Array<MonthlyAnalysisSummaryData> = this.monthlyAnalysisSummaryData.slice(i - 12, i);
        let actualEnergyUse: number = _.sumBy(dataSlice, (data: MonthlyAnalysisSummaryData) => { return data.energyUse });
        let adjustedSum: number = _.sumBy(dataSlice, (data: MonthlyAnalysisSummaryData) => { return data.adjusted });
        let fivePercentEnergy: number = adjustedSum * .95;
        let tenPercentEnergy: number = adjustedSum * .9;
        let fifteenPercentEnergy: number = adjustedSum * .85;
        results.push({
          date: this.monthlyAnalysisSummaryData[i].date,
          rollingSavings: this.monthlyAnalysisSummaryData[i].rollingSavings,
          actualEnergyUse: actualEnergyUse,
          fivePercentEnergy: fivePercentEnergy,
          tenPercentEnergy: tenPercentEnergy,
          fifteenPercentEnergy: fifteenPercentEnergy,
          fivePercentSavings: adjustedSum - fivePercentEnergy,
          tenPercentSavings: adjustedSum - tenPercentEnergy,
          fifteenPercentSavings: adjustedSum - fifteenPercentEnergy
        })
      }
    }

    return results;
  }



  getPercentValue(value: number): string {
    return (value).toLocaleString(undefined, { maximumFractionDigits: 2, minimumIntegerDigits: 1 })
  }
}
