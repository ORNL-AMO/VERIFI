import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AnalysisCalculationsHelperService } from 'src/app/shared/shared-analysis/calculations/analysis-calculations-helper.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AnnualAnalysisSummary, FacilityGroupSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-facility-analysis-graph',
  templateUrl: './annual-facility-analysis-graph.component.html',
  styleUrls: ['./annual-facility-analysis-graph.component.css']
})
export class AnnualFacilityAnalysisGraphComponent implements OnInit {
  @Input()
  groupSummaries: Array<FacilityGroupSummary>;
  @Input()
  analysisItem: IdbAnalysisItem;
  @Input()
  facility: IdbFacility;
  @Input()
  annualAnalysisSummary: Array<AnnualAnalysisSummary>

  @ViewChild('percentImprovementAnalysisGraph', { static: false }) percentImprovementAnalysisGraph: ElementRef;
  @ViewChild('annualEnergyIntensityAnalysisGraph', { static: false }) annualEnergyIntensityAnalysisGraph: ElementRef;
  @ViewChild('percentAnnualImprovementAnalysisGraph', { static: false }) percentAnnualImprovementAnalysisGraph: ElementRef;


  constructor(private plotlyService: PlotlyService, private utilityMeterGroupDbService: UtilityMeterGroupdbService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawAnnualEnergyIntensityGraph();
    this.drawPercentImprovementGraph();
    this.drawPercentAnnualImprovementGraph();
  }

  drawAnnualEnergyIntensityGraph() {
    if (this.annualEnergyIntensityAnalysisGraph) {
      let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(this.facility, this.analysisItem);
      let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
      let endDate: Date = monthlyStartAndEndDate.endDate;
      let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, this.facility);
      let reportYear: number = this.analysisItem.reportYear;
      if (this.facility.fiscalYear == 'nonCalendarYear' && this.facility.fiscalYearCalendarEnd) {
        baselineYear = baselineYear - 1;
        reportYear = reportYear - 1;
      }

      let x1 = new Array();
      let x2 = new Array();
      for (let summaryYear: number = baselineYear; summaryYear <= reportYear; summaryYear++) {
        x1.push(summaryYear)
        x1.push(summaryYear);
        x2.push('Actual');
        x2.push('Modeled');
      }

      let x = [x1, x2];

      let traceData = new Array();

      this.groupSummaries.forEach(summary => {
        let groupName: string = this.utilityMeterGroupDbService.getGroupName(summary.group.idbGroupId)
        let yData = new Array();
        // summary.annualAnalysisSummaries.forEach(annualSummary => {
        //   yData.push(annualSummary.energyUse);
        //   yData.push(annualSummary.modeledEnergyUse);
        // });
        let barTrace = {
          x: x,
          y: yData,
          // width: summariesCopy.map(summary => { return .75 }),
          // texttemplate: '%{value:.5f}',
          name: groupName,
          type: 'bar',
          marker: {
            line: {
              color: 'black',
              width: 2
            }
          }
        }
        traceData.push(barTrace);
      });

      let layout = {
        barmode: "stack",
        xaxis: {
          type: "multicategory",
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
        // margin: {
        //   r: 75,
        //   l: 75,
        //   t: 50,
        //   b: 50
        // }
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

      let summariesCopy: Array<AnnualAnalysisSummary> = JSON.parse(JSON.stringify(this.annualAnalysisSummary));
      this.groupSummaries.forEach(groupSummary => {
        let groupName: string = this.utilityMeterGroupDbService.getGroupName(groupSummary.group.idbGroupId)

        // let lineTrace = {
        //   x: groupSummary.annualAnalysisSummaries.map(summary => { return summary.year }),
        //   y: groupSummary.annualAnalysisSummaries.map((summary, index) => {
        //     return summary.cumulativeSavings
        //   }),
        //   name: groupName + " Total Contribution (%)",
        //   type: 'lines+markers',
        //   marker: {
        //     size: 16
        //   }
        // }
        // traceData.push(lineTrace);
      })

      // let lineTrace2 = {
      //   x: summariesCopy.map(summary => { return summary.year }),
      //   y: summariesCopy.map((summary, index) => {
      //     return summary.cumulativeSavings
      //   }),
      //   name: "Total Energy Improvement (%)",
      //   type: 'lines+markers',
      //   marker: {
      //     size: 16
      //   }
      // }
      // traceData.push(lineTrace2);


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

  drawPercentAnnualImprovementGraph() {
    if (this.percentAnnualImprovementAnalysisGraph) {
      let traceData = new Array();

      let summariesCopy: Array<AnnualAnalysisSummary> = JSON.parse(JSON.stringify(this.annualAnalysisSummary));

      this.groupSummaries.forEach(groupSummary => {
        let groupName: string = this.utilityMeterGroupDbService.getGroupName(groupSummary.group.idbGroupId)
        // let lineTrace = {
        //   x: groupSummary.annualAnalysisSummaries.map(summary => { return summary.year }),
        //   y: groupSummary.annualAnalysisSummaries.map((summary, index) => {
        //     return summary.annualSavings
        //   }),
        //   name: groupName + " Annual Contribution (%)",
        //   type: 'lines+markers',
        //   texttemplate: '%{value:.5f}',
        //   marker: {
        //     size: 16
        //   }
        // }
        // traceData.push(lineTrace);
      })


      // let lineTrace = {
      //   x: summariesCopy.map(summary => { return summary.year }),
      //   y: summariesCopy.map((summary, index) => {
      //     return summary.annualSavings
      //   }),
      //   name: "Annual Energy Improvement (%)",
      //   type: 'lines+markers',
      //   texttemplate: '%{value:.5f}',
      //   marker: {
      //     size: 16
      //   }
      // }
      // traceData.push(lineTrace);

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
      this.plotlyService.newPlot(this.percentAnnualImprovementAnalysisGraph.nativeElement, traceData, layout, config);

    }
  }

}
