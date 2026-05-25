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
    if (filteredGroups && this.years) {
      const data = filteredGroups.map(group => {
        const xVals = this.years;
        const yVals = this.years.map(year => {
          if (this.savingsData[year] && this.savingsData[year][group.idbGroupId] !== undefined && !isNaN(this.savingsData[year][group.idbGroupId])) {
            return this.savingsData[year][group.idbGroupId];
          }
        });

        return {
          type: "scatter",
          mode: "lines+markers",
          name: this.utilityMeterGroupDbService.getGroupName(group.idbGroupId),
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
      this.plotlyService.newPlot(this.savingsGraph.nativeElement, data, layout, config);
    }
  }

}
