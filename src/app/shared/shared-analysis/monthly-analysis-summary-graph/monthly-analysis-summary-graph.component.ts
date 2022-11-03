import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-analysis-summary-graph',
  templateUrl: './monthly-analysis-summary-graph.component.html',
  styleUrls: ['./monthly-analysis-summary-graph.component.css']
})
export class MonthlyAnalysisSummaryGraphComponent implements OnInit {
  @Input()
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  @Input()
  analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem;
  @Input()
  facilityOrAccount: IdbFacility | IdbAccount;

  @ViewChild('monthlyAnalysisGraph', { static: false }) monthlyAnalysisGraph: ElementRef;


  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.monthlyAnalysisGraph) {
      var trace1 = {
        type: "scatter",
        mode: "lines+markers",
        name: 'Energy Use',
        x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.map(results => { return results.energyUse }),
        line: { color: '#7F7F7F', width: 4 },
        marker:{
          size: 8
        }
      }

      var trace2 = {
        type: "scatter",
        mode: "lines+markers",
        name: 'Adjusted Energy Use',
        x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.map(results => { return results.adjusted }),
        line: { color: '#7D3C98', width: 4 },
        marker:{
          size: 8
        }
      }

      var data = [trace2, trace1];

      var layout = {
        // height: 700,
        legend: {
          orientation: "h"
        },
        // title: {
        //   text: 'Time Series',
        //   font: {
        //     size: 18
        //   },
        // },
        xaxis: {
          hoverformat: "%b, %y"
        },
        yaxis: {
          title: {
            text: this.analysisItem.energyUnit,
            font: {
              size: 16
            },
            standoff: 18
          },
          automargin: true,
        },
        // yaxis2: {
        //   title: {
        //     text: 'Predictor Usage',
        //     font: {
        //       size: 16
        //     },
        //     standoff: 18
        //   },
        //   automargin: true,
        //   side: 'right',
        //   overlaying: 'y'
        // },
        margin: { r: 0, t: 50 }
      };
      var config = { responsive: true };
      this.plotlyService.newPlot(this.monthlyAnalysisGraph.nativeElement, data, layout, config);
    }
  }
}
