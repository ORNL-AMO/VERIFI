import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { Component, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
  selector: 'app-monthly-savings-graph',
  standalone: false,
  templateUrl: './monthly-savings-graph.component.html',
  styleUrl: './monthly-savings-graph.component.css',
})
export class MonthlySavingsGraphComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);

  @Input()
  selectedAnalysisItem: IdbAnalysisItem;
  @Input()
  savingsData: { [monthKey: string]: { [groupId: string]: number } } = {};
  @Input()
  monthKeys: Array<string> = [];

  viewInitialized: boolean = false;

  @ViewChild('monthlySavingsGraph', { static: false }) monthlySavingsGraph: ElementRef;

  constructor(
    private plotlyService: PlotlyService

  ) { }

  ngAfterViewInit() {
    this.viewInitialized = true;
    this.drawChart();
  }

  ngOnChanges() {
    if (this.viewInitialized) {
      this.drawChart();
    }
  }

  drawChart() {
    let filteredGroups = this.selectedAnalysisItem?.groups?.filter(group => {
      return group.analysisType !== 'skip' && group.analysisType !== 'skipAnalysis';
    });
    if (filteredGroups && this.monthKeys) {
      const graphMonthKeys = this.monthKeys.slice(12);
      const data = filteredGroups.map(group => {
        const xVals = graphMonthKeys.map(monthKey => {
          const [year, month] = monthKey.split('-').map(Number);
          const date = new Date(year, month).toLocaleString('en-US', { month: 'short', year: 'numeric' });
          return date;
        });
        const yVals = graphMonthKeys.map(monthKey => {
          if (this.savingsData[monthKey] && this.savingsData[monthKey][group.idbGroupId] !== undefined && !isNaN(this.savingsData[monthKey][group.idbGroupId])) {
            return Math.round(this.savingsData[monthKey][group.idbGroupId]);
          }
          return null;
        });

        return {
          type: "scatter",
          mode: "lines+markers",
          name: this.accountWorkspaceQuery.getMeterGroupName(group.idbGroupId),
          x: xVals,
          y: yVals,
          marker: { size: 8 }
        };
      });

      var layout = {
        legend: {
          orientation: "h"
        },
        xaxis: {
          title: { font: { size: 16 }, hoverformat: "%b, %y" },
          type: 'category'
        },
        yaxis: { title: { text: 'Savings ($)', font: { size: 16 }, standoff: 18 }, automargin: true },
        margin: { r: 0, t: 50 }
      };
      var config = {
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.monthlySavingsGraph.nativeElement, data, layout, config);
    }
  }
}
