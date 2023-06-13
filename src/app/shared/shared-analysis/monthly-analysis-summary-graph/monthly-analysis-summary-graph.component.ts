import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
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

      let trace1Name: string = 'Actual Energy Use';
      let trace2Name: string = 'Calculated Energy Use';
      let yAxisTitle: string = this.analysisItem.energyUnit;
      let traceColor: string = '#7D3C98'
      if (this.analysisItem.analysisCategory == 'water') {
        trace1Name = 'Actual Water Consumption';
        trace2Name = 'Calculated Water Consumption';
        yAxisTitle = this.analysisItem.waterUnit;
        traceColor = '#3498DB';
      }


      var trace1 = {
        type: "scatter",
        mode: "lines+markers",
        name: trace1Name,
        x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.map(results => { return results.energyUse }),
        line: { color: '#7F7F7F', width: 4 },
        marker: {
          size: 8
        }
      }

      var trace2 = {
        type: "scatter",
        mode: "lines+markers",
        name: trace2Name,
        x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.map(results => { return results.adjusted }),
        line: { color: traceColor, width: 4 },
        marker: {
          size: 8
        }
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
            text: yAxisTitle,
            font: {
              size: 16
            },
            standoff: 18
          },
          automargin: true,
        },
        margin: { r: 0, t: 50 }
      };
      var config = {
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.monthlyAnalysisGraph.nativeElement, data, layout, config);
    }
  }
}
