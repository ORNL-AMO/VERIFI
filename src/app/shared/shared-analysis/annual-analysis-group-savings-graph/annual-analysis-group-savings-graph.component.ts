import { Component, ElementRef, Input, Query, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AnalysisGroup, MonthlyAnalysisSummaryData, AnnualAnalysisSummary } from 'src/app/models/analysis';

@Component({
  selector: 'app-annual-analysis-group-savings-graph',
  standalone: false,

  templateUrl: './annual-analysis-group-savings-graph.component.html',
  styleUrl: './annual-analysis-group-savings-graph.component.css'
})
export class AnnualAnalysisGroupSavingsGraphComponent {

  @Input({ required: true })
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;

  @Input({ required: true })
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;

  groupAnalysisData: Array<{ groupId: string, data: Array<{ year: number, savings: number, totalSavingsPercentImprovement: number, contributionPercent: number }> }> = [];

  @ViewChild('groupContributionsGraph', { static: false }) groupContributionsGraph: ElementRef;

  constructor(private plotlyService: PlotlyService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService
  ) { }

  ngOnInit(): void {
    this.groupSummaries.forEach(summary => {
      const grpId = summary.group.idbGroupId;
      const data = summary.annualAnalysisSummaryData.map(yearData => {
        return {
          year: yearData.year,
          savings: yearData.savings,
          totalSavingsPercentImprovement: yearData.totalSavingsPercentImprovement,
          contributionPercent: yearData.savings / this.annualAnalysisSummary.find(y => y.year == yearData.year).adjusted
        }
      });
      this.groupAnalysisData.push({ groupId: grpId, data: data });
    });
  }

  ngAfterViewInit(): void {
    this.drawChart();
  }

  drawChart() {
    const years = this.groupAnalysisData[0].data.map(d => d.year);
    const data = this.groupAnalysisData.map(group => ({
      x: years,
      y: years.map(year => {
        const yearData = group.data.find(d => d.year === year);
        return yearData ? yearData.contributionPercent : 0;
      }),
      name: this.utilityMeterGroupDbService.getGroupName(group.groupId),
      type: 'bar'
    }));

    var layout = {
      barmode: 'relative',
      showlegend: true,
      yaxis: {
        title: {
          text: 'Percent Contribution',
          font: {
            size: 16
          },
        },
        ticksuffix: '%',
        hoverformat: ",.3f",
        automargin: true,
      },
      xaxis: {
        automargin: true
      },
      legend: {
        orientation: "h"
      },
      clickmode: "none",
      margin: { t: 10 }
    };
    let config = {
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
      modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
      displaylogo: false,
      responsive: true,
    };
    this.plotlyService.newPlot(this.groupContributionsGraph.nativeElement, data, layout, config);
  }
}
