import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AnnualGroupSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-energy-intensity-graph',
  templateUrl: './annual-energy-intensity-graph.component.html',
  styleUrls: ['./annual-energy-intensity-graph.component.css']
})
export class AnnualEnergyIntensityGraphComponent implements OnInit {
  @Input()
  annualGroupSummaries: Array<AnnualGroupSummary>;
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

      let summariesCopy: Array<AnnualGroupSummary> = JSON.parse(JSON.stringify(this.annualGroupSummaries));
      let barTrace = {
        x: summariesCopy.map(summary => { return summary.year }),
        y: summariesCopy.map(summary => { return summary.energyIntensity }),
        width: summariesCopy.map(summary => { return .3 }),
        texttemplate: '%{value:.5f}',
        name: "Production Energy Intensity",
        type: 'bar',
      }
      traceData.push(barTrace);

      let layout = {
        // title: 'Energy Intensity',
        xaxis: {
          title: 'Reporting Fiscal Year',
          tickmode: 'linear'
        },
        yaxis: {
          title: 'Energy Intensity',
          hoverformat: ",.5f",
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
      this.plotlyService.newPlot(this.annualEnergyIntensityAnalysisGraph.nativeElement, traceData, layout, config);

    }
  }

  drawPercentImprovementGraph() {
    if (this.percentImprovementAnalysisGraph) {
      let traceData = new Array();

      let summariesCopy: Array<AnnualGroupSummary> = JSON.parse(JSON.stringify(this.annualGroupSummaries));

      let lineTrace = {
        x: summariesCopy.map(summary => { return summary.year }),
        y: summariesCopy.map((summary, index) => {
          return summary.annualEnergyIntensityChange
        }),
        name: "Annual Improvement in Energy Intensity (%)",
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
          return summary.totalEnergyIntensityChange
        }),
        name: "Total Improvement in Energy Intensity (%)",
        type: 'lines+markers',
        marker: {
          size: 16
        }
      }
      traceData.push(lineTrace2);


      let layout = {
        // title: 'Energy Intensity',
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
