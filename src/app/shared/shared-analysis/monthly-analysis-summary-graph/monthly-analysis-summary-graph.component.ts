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
      var trace1 = {
        type: "scatter",
        mode: "lines+markers",
        name: 'Actual Energy Use',
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
        name: 'Calculated Energy Use',
        x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
        y: this.monthlyAnalysisSummaryData.map(results => { return results.adjusted }),
        line: { color: '#7D3C98', width: 4 },
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
            text: this.analysisItem.energyUnit,
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
