import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AnnualRegressionSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-regression-analysis-graph',
  templateUrl: './annual-regression-analysis-graph.component.html',
  styleUrls: ['./annual-regression-analysis-graph.component.css']
})
export class AnnualRegressionAnalysisGraphComponent implements OnInit {
  @Input()
  annualRegressionSummary: Array<AnnualRegressionSummary>;
  @Input()
  analysisItem: IdbAnalysisItem;

  @ViewChild('percentImprovementAnalysisGraph', { static: false }) percentImprovementAnalysisGraph: ElementRef;
  @ViewChild('annualEnergyIntensityAnalysisGraph', { static: false }) annualEnergyIntensityAnalysisGraph: ElementRef;

  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawAnnualEnergyIntensityGraph();
    this.drawPercentImprovementGraph();
  }

  drawAnnualEnergyIntensityGraph() {
    if (this.annualEnergyIntensityAnalysisGraph) {
      let traceData = new Array();

      let summariesCopy: Array<AnnualRegressionSummary> = JSON.parse(JSON.stringify(this.annualRegressionSummary));
      let barTrace = {
        x: summariesCopy.map(summary => { return summary.year }),
        y: summariesCopy.map(summary => { return summary.energyUse }),
        // width: summariesCopy.map(summary => { return .75 }),
        // texttemplate: '%{value:.5f}',
        name: "Energy Use",
        type: 'bar',
        marker: {
          color: '#7F7F7F'
        }
      }
      traceData.push(barTrace);

      barTrace = {
        x: summariesCopy.map(summary => { return summary.year }),
        y: summariesCopy.map(summary => { return summary.modeledEnergyUse }),
        // width: summariesCopy.map(summary => { return .75 }),
        // texttemplate: '%{value:.5f}',
        name: "Modeled Energy Use",
        type: 'bar',
        marker: {
          color: '#7D3C98'
        }
      }
      traceData.push(barTrace);

      let layout = {
        xaxis: {
          title: 'Reporting Fiscal Year',
          tickmode: 'linear'
        },
        yaxis: {
          title: 'Energy Use (' + this.analysisItem.energyUnit + ')',
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

      let summariesCopy: Array<AnnualRegressionSummary> = JSON.parse(JSON.stringify(this.annualRegressionSummary));

      let lineTrace = {
        x: summariesCopy.map(summary => { return summary.year }),
        y: summariesCopy.map((summary, index) => {
          return summary.annualSavings
        }),
        name: "Annual Energy Improvement (%)",
        type: 'lines+markers',
        texttemplate: '%{value:.5f}',
        marker: {
          size: 16
        }
      }
      traceData.push(lineTrace);

      let lineTrace2 = {
        x: summariesCopy.map(summary => { return summary.year }),
        y: summariesCopy.map((summary, index) => {
          return summary.cumulativeSavings
        }),
        name: "Total Energy Improvement (%)",
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
