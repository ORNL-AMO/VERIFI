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
      var trace1 = {
        type: "scatter",
        mode: "none",
        name: 'Savings',
        x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.map(results => {
          if (results.percentSavingsComparedToBaseline >= 0) {
            return results.percentSavingsComparedToBaseline
          } else {
            return undefined;
          }
        }),
        line: { color: '#27AE60', width: 4 },
        fill:'tozero',
        fillcolor:'#1B5E20',
        marker: {
          // size: 8
        },
        stackgroup: 'one'
      }

      var trace2 = {
        type: "scatter",
        mode: "none",
        name: 'Losses',
        x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.map(results => {
          if (results.percentSavingsComparedToBaseline < 0) {
            return results.percentSavingsComparedToBaseline
          } else {
            return undefined;
          }
        }),
        line: { color: '#E74C3C', width: 4 },
        fill: 'tozero',
        fillcolor: '#B71C1C',
        marker: {
          // size: 8
        },
        stackgroup: 'two'
      }

      var data = [trace2, trace1];


      var layout = {
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
      var config = { responsive: true };
      this.plotlyService.newPlot(this.monthlyAnalysisSavingsGraph.nativeElement, data, layout, config);
    }
  }

}
