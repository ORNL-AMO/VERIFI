import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
    selector: 'app-annual-analysis-summary-graph',
    templateUrl: './annual-analysis-summary-graph.component.html',
    styleUrls: ['./annual-analysis-summary-graph.component.css'],
    standalone: false
})
export class AnnualAnalysisSummaryGraphComponent implements OnInit {
  @Input()
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  @Input()
  analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem;
  @Input()
  inHomeScreen: boolean;
  @Input()
  inReport: boolean;
  @Input()
  print: boolean;

  @ViewChild('percentImprovementAnalysisGraph', { static: false }) percentImprovementAnalysisGraph: ElementRef;
  @ViewChild('annualEnergyIntensityAnalysisGraph', { static: false }) annualEnergyIntensityAnalysisGraph: ElementRef;

  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawAnnualEnergyIntensityGraph();
    if (!this.inHomeScreen) {
      this.drawPercentImprovementGraph();
    }
  }

  drawAnnualEnergyIntensityGraph() {
    if (this.annualEnergyIntensityAnalysisGraph) {


      let trace1Name: string = 'Actual Energy Use';
      let trace2Name: string = 'Calculated Energy Use';
      let yAxisTitle: string = 'Energy Use (' + this.analysisItem.energyUnit + ')';
      let traceColor: string = '#7D3C98'
      if (this.analysisItem.analysisCategory == 'water') {
        trace1Name = 'Actual Water Consumption';
        trace2Name = 'Calculated Water Consumption';
        yAxisTitle = 'Consumption  (' + this.analysisItem.waterUnit + ')';
        traceColor = '#3498DB';
      }



      let traceData = new Array();
      let barTrace = {
        x: this.annualAnalysisSummary.map(summary => { return summary.year }),
        y: this.annualAnalysisSummary.map(summary => { return summary.energyUse }),
        // width: summariesCopy.map(summary => { return .75 }),
        // texttemplate: '%{value:.5f}',
        name: trace1Name,
        type: 'bar',
        marker: {
          color: '#7F7F7F'
        }
      }
      traceData.push(barTrace);

      barTrace = {
        x: this.annualAnalysisSummary.map(summary => { return summary.year }),
        y: this.annualAnalysisSummary.map(summary => { return summary.adjusted }),
        // width: summariesCopy.map(summary => { return .75 }),
        // texttemplate: '%{value:.5f}',
        name: trace2Name,
        type: 'bar',
        marker: {
          color: traceColor
        }
      }
      traceData.push(barTrace);

      let height: number;
      if(this.inHomeScreen){
        height = 350;
      }
      let layout = {
        height: height,
        xaxis: {
          title: 'Reporting Fiscal Year',
          tickmode: 'linear'
        },
        yaxis: {
          title: yAxisTitle,
          hoverformat: ",.2f",
        },
        legend: {
          orientation: "h",
          yanchor: "top",
          y: 1.25
        },
        margin: {
          r: 75,
          l: 75,
          t: 50,
          b: 50
        }
      };

      var config = {
        responsive: true,
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
      };
      this.plotlyService.newPlot(this.annualEnergyIntensityAnalysisGraph.nativeElement, traceData, layout, config);

    }
  }

  drawPercentImprovementGraph() {
    if (this.percentImprovementAnalysisGraph) {
      let traceData = new Array();



      let trace1Name: string = 'Annual Energy Improvement (%)';
      let trace2Name: string = 'Total Energy Improvement (%)';
      if (this.analysisItem.analysisCategory == 'water') {
        trace1Name = 'Annual Consumption Improvement (%)';
        trace2Name = 'Total Consumption Improvement (%)';
      }

      let lineTrace = {
        x: this.annualAnalysisSummary.map(summary => { return summary.year }),
        y: this.annualAnalysisSummary.map((summary, index) => {
          return summary.annualSavingsPercentImprovement
        }),
        name: trace1Name,
        type: 'lines+markers',
        texttemplate: '%{value:.5f}',
        marker: {
          size: 16
        }
      }
      traceData.push(lineTrace);

      let lineTrace2 = {
        x: this.annualAnalysisSummary.map(summary => { return summary.year }),
        y: this.annualAnalysisSummary.map((summary, index) => {
          return summary.totalSavingsPercentImprovement
        }),
        name: trace2Name,
        type: 'lines+markers',
        marker: {
          size: 16
        }
      }
      traceData.push(lineTrace2);


      let layout = {
        xaxis: {
          title: 'Reporting Fiscal Year',
          tickmode: 'linear'
        },
        yaxis: {
          title: 'Percent Improvement',
          ticksuffix: '%',
          hoverformat: ",.3f",
        },
        legend: {
          orientation: "h",
          yanchor: "top",
          y: 1.25
        },
        margin: {
          r: 75,
          l: 75,
          t: 50,
          b: 150
        }
      };

      var config = {
        responsive: true,
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
      };
      this.plotlyService.newPlot(this.percentImprovementAnalysisGraph.nativeElement, traceData, layout, config);

    }
  }
}
