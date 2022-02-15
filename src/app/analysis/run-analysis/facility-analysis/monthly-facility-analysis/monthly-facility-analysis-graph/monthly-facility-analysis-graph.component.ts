import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { MonthlyFacilityAnalysisData } from 'src/app/analysis/calculations/facility-analysis-calculations.service';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';

@Component({
  selector: 'app-monthly-facility-analysis-graph',
  templateUrl: './monthly-facility-analysis-graph.component.html',
  styleUrls: ['./monthly-facility-analysis-graph.component.css']
})
export class MonthlyFacilityAnalysisGraphComponent implements OnInit {
  @Input()
  monthlyFacilityAnalysisData: Array<MonthlyFacilityAnalysisData>;
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
        name: 'Total Energy Use',
        x: this.monthlyFacilityAnalysisData.map(results => { return results.date }),
        y: this.monthlyFacilityAnalysisData.map(results => { return _.sumBy(results.utilityUsage, 'usage') }),
        line: { color: '#7F7F7F', width: 4 },
        marker:{
          size: 8
        }
      }

      var trace2 = {
        type: "scatter",
        mode: "lines+markers",
        name: 'Modeled Energy Use',
        x: this.monthlyFacilityAnalysisData.map(results => { return results.date }),
        y: this.monthlyFacilityAnalysisData.map(results => { return _.sumBy(results.utilityUsage, 'modeledUsage') }),
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
