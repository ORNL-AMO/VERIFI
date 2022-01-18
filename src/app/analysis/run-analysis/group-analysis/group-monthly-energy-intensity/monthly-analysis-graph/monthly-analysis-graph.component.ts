import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { Month, Months } from 'src/app/form-data/months';
import { MonthlyGroupSummary } from 'src/app/models/analysis';

@Component({
  selector: 'app-monthly-analysis-graph',
  templateUrl: './monthly-analysis-graph.component.html',
  styleUrls: ['./monthly-analysis-graph.component.css']
})
export class MonthlyAnalysisGraphComponent implements OnInit {
  @Input()
  monthlyGroupSummaries: Array<MonthlyGroupSummary>;
  @Input()
  facility: IdbFacility;
  @Input()
  analysisItem: IdbAnalysisItem;
  @Input()
  baselineEnergyIntensity: number;

  @ViewChild('monthlyAnalysisGraph', { static: false }) monthlyAnalysisGraph: ElementRef;

  yearData: Array<{
    year: number,
    summaries: Array<MonthlyGroupSummary>
  }>
  markerColors: Array<string> = [
    'purple',
    'blue',
    'green',
    'red',
    'black',
    'orange',
    'yellow'
  ]
  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
    this.yearData = this.getYearData();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.monthlyAnalysisGraph) {
      let traceData = new Array();

      let xData: Array<number> = this.yearData[0].summaries.map(summary => { return new Date(summary.date).getUTCMonth() });
      let months: Array<string> = xData.map(data => { return this.getMonth(data) });
      this.yearData.forEach((dataItem, index) => {
        let yData: Array<number> = dataItem.summaries.map(summary => { return summary.energyIntensity });
        traceData.push({
          x: months,
          y: yData,
          mode: 'markers',
          name: dataItem.year,
          marker: {
            color: this.markerColors[index],
            size: 16
          }
        });

      });


      traceData.push({
        x: months,
        y: months.map(month => { return this.baselineEnergyIntensity }),
        mode: 'lines',
        name: 'Baseline EI',
        marker: {
          color: 'black'
        }
      });

      let layout = {
        title: 'Energy Intensity',
        xaxis: {
          title: 'Month',
        },
        yaxis: {
          title: 'Energy Intensity',
        }
      };

      var config = {
        responsive: true,
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
      };
      this.plotlyService.newPlot(this.monthlyAnalysisGraph.nativeElement, traceData, layout, config);

    }
  }

  getMonth(num: number): string {
    let month: Month = Months.find(month => { return month.monthNumValue == num });
    return month.abbreviation;
  }


  getYearData(): Array<{
    year: number,
    summaries: Array<MonthlyGroupSummary>
  }> {
    let traceData: Array<{
      year: number,
      summaries: Array<MonthlyGroupSummary>
    }> = new Array();
    let startDate: Date = new Date(this.facility.sustainabilityQuestions.energyReductionBaselineYear, 0);
    let endDate: Date = new Date(this.analysisItem.reportYear, 12);

    while (startDate.getUTCFullYear() < endDate.getUTCFullYear()) {
      let yearGroupSummaries: Array<MonthlyGroupSummary> = this.monthlyGroupSummaries.filter(summary => {
        let summaryDate: Date = new Date(summary.date);
        return summaryDate.getUTCFullYear() == startDate.getUTCFullYear();
      });

      traceData.push({
        year: new Date(startDate).getUTCFullYear(),
        summaries: yearGroupSummaries
      });
      startDate.setUTCFullYear(startDate.getUTCFullYear() + 1);
    }
    return traceData;
  }
}
