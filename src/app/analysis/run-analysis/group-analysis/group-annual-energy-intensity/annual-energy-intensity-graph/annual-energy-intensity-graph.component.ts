import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AnnualGroupSummary } from 'src/app/analysis/calculations/energy-intensity.service';
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

  @ViewChild('annualAnalysisGraph', { static: false }) annualAnalysisGraph: ElementRef;

  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.annualAnalysisGraph) {
      let traceData = new Array();

      let summariesCopy: Array<AnnualGroupSummary> = JSON.parse(JSON.stringify(this.annualGroupSummaries));
      //remove baseline
      // summariesCopy = summariesCopy.splice(1);
      let barTrace = {
        x: summariesCopy.map(summary => { return summary.year }),
        y: summariesCopy.map(summary => { return summary.energyIntensity }),
        width: summariesCopy.map(summary => { return .3 }),
        name: "Production Energy Intensity",
        type: 'bar'
      }
      traceData.push(barTrace);

      let lineTrace = {
        x: summariesCopy.map(summary => { return summary.year }),
        y: summariesCopy.map((summary, index) => {
          if (index == 0) {
            return undefined
          } else {
            return summary.annualEnergyIntensityChange
          }
        }),
        name: "Annual Improvement in Energy Intensity (%)",
        type: 'lines+markers',
        yaxis: 'y2',
        marker: {
          size: 16
        }
      }
      traceData.push(lineTrace);

      let lineTrace2 = {
        x: summariesCopy.map(summary => { return summary.year }),
        y: summariesCopy.map((summary, index) => {
          if (index == 0) {
            return undefined
          } else {
            return summary.cumulativeEnergyIntensityChange
          }
        }),
        name: "Total Improvement in Energy Intensity (%)",
        type: 'lines+markers',
        yaxis: 'y2',
        marker: {
          size: 16
        }
      }
      traceData.push(lineTrace2);


      let layout = {
        // title: 'Energy Intensity',
        xaxis: {
          title: 'Reporting Year',
          tickmode: 'linear'
        },
        yaxis: {
          title: 'Energy Intensity',
        },
        yaxis2: {
          title: 'Percent Improvement',
          overlaying: 'y',
          side: 'right',
          ticksuffix: '%',
          hoverformat: ",.2f",
          showgrid: false,
          zeroline: false
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
      this.plotlyService.newPlot(this.annualAnalysisGraph.nativeElement, traceData, layout, config);

    }
  }

}
