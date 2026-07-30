import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
  selector: 'app-annual-savings-graph',
  standalone: false,
  templateUrl: './annual-savings-graph.component.html',
  styleUrl: './annual-savings-graph.component.css',
})
export class AnnualSavingsGraphComponent {

  @Input()
  years: Array<number>;
  @Input()
  selectedAnalysisItem: IdbAnalysisItem;
  @Input()
  savingsData: { [year: number]: { [groupId: string]: number } };

  viewInitialized: boolean = false;

  @ViewChild('savingsGraph', { static: false }) savingsGraph: ElementRef;

  constructor(
    private plotlyService: PlotlyService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService
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

    if (!filteredGroups || filteredGroups.length === 0 || !this.years || this.years.length < 2) {
      return;
    }

    const totalBarWidth = 0.6;
    const outerPadding = 0.04;
    const gapBetweenSubBars = 0.02;
    const totalGroups = filteredGroups.length;

    const usableInnerWidth = totalBarWidth - (2 * outerPadding);
    const innerBarWidth = (usableInnerWidth - (gapBetweenSubBars * (totalGroups - 1))) / totalGroups;
    const startOffset = -(totalBarWidth / 2) + outerPadding;

    const graphYears = this.years.slice(1);

    if (filteredGroups && this.years) {
      const groupData = filteredGroups.map((group, index) => {
        const xVals = graphYears;
        const yVals = graphYears.map(year => {
          if (this.savingsData[year] && this.savingsData[year][group.idbGroupId] !== undefined && !isNaN(this.savingsData[year][group.idbGroupId])) {
            return Math.round(this.savingsData[year][group.idbGroupId]);
          }
        });
        const computedOffset = startOffset + (index * (innerBarWidth + gapBetweenSubBars));

        return {
          type: "bar",
          name: this.utilityMeterGroupDbService.getGroupName(group.idbGroupId),
          x: xVals,
          y: yVals,
          width: innerBarWidth,
          offset: computedOffset,
          marker: { size: 8 }
        };
      });

      const totalSavings = graphYears.map(year => {
        let total = 0;
        filteredGroups.forEach(group => {
          if (this.savingsData[year] && this.savingsData[year][group.idbGroupId] !== undefined && !isNaN(this.savingsData[year][group.idbGroupId])) {
            total += this.savingsData[year][group.idbGroupId];
          }
        });
        return Math.round(total);
      });

      const totalTrace = {
        type: "bar",
        name: "Total",
        x: graphYears,
        y: totalSavings,
        width: totalBarWidth,
        marker: {
          color: 'rgba(44, 56, 107, 0.18)',
          line: { color: 'rgba(44, 56, 107, 0.45)', width: 1 }
        },
        text: totalSavings.map(v => `$${v.toLocaleString()}`),
        textposition: 'outside',
        cliponaxis: false,
        hovertemplate: 'Year %{x}<br>Total: $%{y:,.0f}<extra></extra>'
      };

      const data = [totalTrace, ...groupData];

      var layout = {
        barmode: 'overlay',
        legend: {
          orientation: "h"
        },
        xaxis: {
          title: { font: { size: 16 }, hoverformat: "%b, %y" },
          type: 'category',
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
      this.plotlyService.newPlot(this.savingsGraph.nativeElement, data, layout, config);
    }
  }

}
