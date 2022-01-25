import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { Month, Months } from 'src/app/shared/form-data/months';
import { MonthlyGroupSummary } from 'src/app/models/analysis';
import { EnergyIntensityService } from 'src/app/analysis/calculations/energy-intensity.service';

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
  }>;
  constructor(private plotlyService: PlotlyService, private energyIntensityService: EnergyIntensityService) { }

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
        let color: string;
        let symbol: string;
        if (index == 0 || index == this.yearData.length - 1) {
          symbol = 'square';
          if (index == 0) {
            color = 'black';
          }
        } else if (index != 0 && index != this.yearData.length - 1) {
          symbol = 'circle'
        }
        let yData: Array<number> = dataItem.summaries.map(summary => { return summary.energyIntensity });
        traceData.push({
          x: months,
          y: yData,
          mode: 'markers',
          name: 'FY - ' + dataItem.year,
          marker: {
            color: color,
            size: 18,
            symbol: symbol
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
          hoverformat: ",.2f",
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
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.energyIntensityService.getMonthlyStartAndEndDate(this.facility, this.analysisItem);
    let startDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;
    while (startDate < endDate) {
      let dateRangeDate: Date = new Date(startDate.getUTCFullYear() + 1, startDate.getUTCMonth());
      let yearGroupSummaries: Array<MonthlyGroupSummary> = this.monthlyGroupSummaries.filter(summary => {
        let summaryDate: Date = new Date(summary.date);
        return summaryDate >= startDate && summaryDate < dateRangeDate;
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
