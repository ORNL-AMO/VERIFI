import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
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

  @ViewChild('monthlyAnalysisSavingsGraph', { static: false }) monthlyAnalysisSavingsGraph: ElementRef;


  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.monthlyAnalysisSavingsGraph) {
      // let postiveData: Array<MonthlyAnalysisSummaryData> = this.monthlyAnalysisSummaryData.filter(data => {
      //   return data.savings >= 0;
      // })
      var trace1 = {
        type: "scatter",
        mode: "none",
        name: 'Savings',
        x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.map(results => {
          if (results.savings >= 0) {
            return results.savings
          } else {
            return undefined;
          }
        }),
        // line: { color: '#27AE60' },
        fill:'tozero',
        fillcolor:'#27AE60',
        marker: {
          // size: 8
        },
        stackgroup: 'one',
      }


      // let negativeData: Array<MonthlyAnalysisSummaryData> = this.monthlyAnalysisSummaryData.filter(data => {
      //   return data.savings < 0;
      // })

      var trace2 = {
        type: "scatter",
        mode: "none",
        name: 'Losses',
        x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.map(results => {
          if (results.savings < 0) {
            return results.savings
          } else {
            return undefined;
          }
        }),
        // line: { color: '#E74C3C' },
        fill: 'tozero',
        fillcolor: '#E74C3C',
        marker: {
          // size: 8
        },
        stackgroup: 'two'
      }

      var data = [trace2, trace1];

      let traces = new Array();
      let isPositive: boolean = this.monthlyAnalysisSummaryData[0].savings >= 0;
      let currentTraceData: Array<MonthlyAnalysisSummaryData> = new Array();
      let index: number = 1;
      this.monthlyAnalysisSummaryData.forEach((dataItem) => {
        if (isPositive && dataItem.savings >= 0) {
          //still positive
          currentTraceData.push(dataItem);
        } else if (!isPositive && dataItem.savings < 0) {
          //still negative
          currentTraceData.push(dataItem);
        } else {
          let color: string;
          if (isPositive) {
            color = '#27AE60';
          } else {
            color = '#E74C3C';
          }

          traces.push({
            type: "scatter",
            mode: "lines+markers",
            name: 'Savings',
            x: currentTraceData.map(results => { return results.date }),
            y: currentTraceData.map(results => { return results.savings }),
            line: { color: color, width: 4 },
            marker: {
              size: 8
            },
            legendgroup: 'legend1',
            stackgroup: 'group' + index,
          });
          currentTraceData = new Array();
          isPositive = dataItem.savings >= 0;
          currentTraceData.push(dataItem);
          index++;
        }
      });


      console.log(traces);
      var layout = {
        legend: {
          orientation: "h"
        },
        xaxis: {
          hoverformat: "%b, %y"
        },
        yaxis: {
          title: {
            text: this.analysisItem.energyUnit,
            font: {
              size: 16
            },
            // standoff: 18
          },
          automargin: true,
        },
        margin: { r: 0, t: 50 }
      };
      var config = { responsive: true };
      this.plotlyService.newPlot(this.monthlyAnalysisSavingsGraph.nativeElement, data, layout, config);
    }
  }

}
