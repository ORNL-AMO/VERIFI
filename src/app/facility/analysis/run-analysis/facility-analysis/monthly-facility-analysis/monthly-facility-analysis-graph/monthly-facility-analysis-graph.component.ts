import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';

@Component({
  selector: 'app-monthly-facility-analysis-graph',
  templateUrl: './monthly-facility-analysis-graph.component.html',
  styleUrls: ['./monthly-facility-analysis-graph.component.css']
})
export class MonthlyFacilityAnalysisGraphComponent implements OnInit {
  @Input()
  monthlyFacilityAnalysisData: Array<MonthlyAnalysisSummaryData>;
  @Input()
  analysisItem: IdbAnalysisItem;
  @Input()
  facility: IdbFacility;

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
        name: 'Actual Total',
        x: this.monthlyFacilityAnalysisData.map(results => { return results.date }),
        y: this.monthlyFacilityAnalysisData.map(results => { return results.energyUse }),
        line: { color: '#7F7F7F', width: 4 },
        marker:{
          size: 8
        }
      }

      var trace2 = {
        type: "scatter",
        mode: "lines+markers",
        name: 'Adjusted BL',
        x: this.monthlyFacilityAnalysisData.map(results => { return results.date }),
        y: this.monthlyFacilityAnalysisData.map(results => { return results.adjustedBaselineEnergyUse }),
        line: { color: '#7D3C98', width: 4 },
        marker:{
          size: 8
        }
      }

      var data = [trace1, trace2];

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
