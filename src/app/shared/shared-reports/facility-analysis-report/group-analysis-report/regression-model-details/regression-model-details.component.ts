import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisGroupItem } from 'src/app/shared/shared-analysis/analysisGroupItem';

@Component({
    selector: 'app-regression-model-details',
    templateUrl: './regression-model-details.component.html',
    styleUrl: './regression-model-details.component.css',
    standalone: false
})
export class RegressionModelDetailsComponent {
  @Input({ required: true })
  groupItem: AnalysisGroupItem;
  @Input({ required: true })
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  facility: IdbFacility;
  @Input()
  hideGraph: boolean;



  @ViewChild('monthlyAnalysisGraph', { static: false }) monthlyAnalysisGraph: ElementRef;
  constructor(private plotlyService: PlotlyService) { }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.monthlyAnalysisGraph) {
      let name: string = this.getGraphName();

      let yAxisTitle: string = this.analysisItem.energyUnit;
      let traceColor: string = '#7D3C98'
      if (this.analysisItem.analysisCategory == 'water') {
        yAxisTitle = this.analysisItem.waterUnit;
        traceColor = '#3498DB';
      }

      var data = [];
      if (this.monthlyAnalysisSummaryData) {
        var trace1 = {
          type: "scatter",
          mode: "lines+markers",
          name: name,
          x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
          y: this.monthlyAnalysisSummaryData.map(results => { return results.modeledEnergy }),
          line: { color: '#BB8FCE', width: 4 },
          marker: {
            size: 8
          }
        }
        let potentialModelYearData: Array<MonthlyAnalysisSummaryData> = this.monthlyAnalysisSummaryData.filter(data => {
          return data.fiscalYear == this.groupItem.selectedModel.modelYear;
        });
        var trace2 = {
          type: "scatter",
          mode: "markers",
          name: 'Model Year',
          x: potentialModelYearData.map(results => { return results.date }),
          y: potentialModelYearData.map(results => { return results.modeledEnergy }),
          line: { color: '#8E44AD', width: 4 },
          marker: {
            size: 16,
            symbol: 'star'
          }
        }


        var trace3 = {
          type: "scatter",
          mode: "markers",
          name: this.getTrace3Name(),
          x: this.monthlyAnalysisSummaryData.map(results => { return results.date }),
          y: this.monthlyAnalysisSummaryData.map(results => { return results.energyUse }),
          line: { color: '#515A5A', width: 4 },
          marker: {
            size: 10,
            symbol: 'square'
          }
        }
        data = [trace3, trace1, trace2]
      }

      var layout = {
        // height: 700,
        legend: {
          orientation: "h"
        },
        title: {
          text: this.getGraphTitle(),
          font: {
            size: 18
          },
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
      var config = { responsive: true };
      this.plotlyService.newPlot(this.monthlyAnalysisGraph.nativeElement, data, layout, config);
    }
  }


  getGraphName(): string {
    if (this.analysisItem.analysisCategory == 'energy') {
      return 'Modeled Energy';
    } else if (this.analysisItem.analysisCategory == 'water') {
      return 'Modeled Water';
    }
    return '';
  }

  getTrace3Name(): string {
    if (this.analysisItem.analysisCategory == 'energy') {
      return 'Actual Energy';
    } else if (this.analysisItem.analysisCategory == 'water') {
      return 'Actual Consumption';
    }
  }

  getTrace4Name(): string {
    if (this.analysisItem.analysisCategory == 'energy') {
      return 'Current Modeled Energy';
    } else if (this.analysisItem.analysisCategory == 'water') {
      return 'Current Modeled Consumption';
    }
  }

  getGraphTitle(): string {
    if (this.analysisItem.analysisCategory == 'energy') {
      return 'Comparison of Actual and Modeled Energy Use';
    } else if (this.analysisItem.analysisCategory == 'water') {
      return 'Comparison of Actual and Modeled Water Consumption';
    }
  }
}
