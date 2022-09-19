import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbAccount, IdbFacility, MeterSource } from 'src/app/models/idb';
import { BarChartDataTrace, ReportOptions, ReportUtilitySummary } from 'src/app/models/overview-report';
import { UtilityColors } from 'src/app/shared/utilityColors';

@Component({
  selector: 'app-account-report-utility-usage-bar-chart',
  templateUrl: './account-report-utility-usage-bar-chart.component.html',
  styleUrls: ['./account-report-utility-usage-bar-chart.component.css']
})
export class AccountReportUtilityUsageBarChartComponent implements OnInit {
  @Input()
  account: IdbAccount;
  @Input()
  facilitiesUtilitySummaries: Array<{
    utilitySummary: ReportUtilitySummary,
    facility: IdbFacility
  }>;
  @Input()
  reportOptions: ReportOptions;
  @Input()
  graphType: 'cost' | 'locationEmissions' | 'usage' | 'marketEmissions';

  @ViewChild('utilityBarChart', { static: false }) utilityBarChart: ElementRef;
  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }
  
  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.utilityBarChart) {
      let data = this.getData();
      var layout = {
        barmode: 'stack',
        showlegend: true,
        yaxis: {
          title: this.getYAxisLabel(),
          tickprefix: this.getPreffix(),
          automargin: true,
        },
        xaxis: {
          automargin: true
        },
        legend: {
          orientation: "h"
        },
        clickmode: "none"
      };
      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };
      this.plotlyService.newPlot(this.utilityBarChart.nativeElement, data, layout, config);
    }
  }

  getData(): Array<BarChartDataTrace> {
    let dataType: 'consumptionTargetYear' | 'costTargetYear' | 'locationEmissionsTargetYear' | 'marketEmissionsTargetYear';
    if (this.graphType == 'cost') {
      dataType = 'costTargetYear'
    } else if (this.graphType == 'usage') {
      dataType = 'consumptionTargetYear';
    } else if (this.graphType == 'locationEmissions') {
      dataType = 'locationEmissionsTargetYear';
    } else if (this.graphType == 'marketEmissions') {
      dataType = 'marketEmissionsTargetYear';
    }

    let data: Array<BarChartDataTrace> = new Array();
    if (this.reportOptions.electricity) {
      let trace: BarChartDataTrace = this.getTrace('Electricity', dataType);
      data.push(trace);
    }
    if (this.reportOptions.naturalGas) {
      let trace: BarChartDataTrace = this.getTrace('Natural Gas', dataType);
      data.push(trace);
    }
    if (this.reportOptions.otherFuels) {
      let trace: BarChartDataTrace = this.getTrace('Other Fuels', dataType);
      data.push(trace);
    }
    if (this.reportOptions.otherEnergy) {
      let trace: BarChartDataTrace = this.getTrace('Other Energy', dataType);
      data.push(trace);
    }
    if (this.reportOptions.water) {
      let trace: BarChartDataTrace = this.getTrace('Water', dataType);
      data.push(trace);
    }
    if (this.reportOptions.wasteWater) {
      let trace: BarChartDataTrace = this.getTrace('Waste Water', dataType);
      data.push(trace);
    }
    if (this.reportOptions.otherUtility) {
      let trace: BarChartDataTrace = this.getTrace('Other Utility', dataType);
      data.push(trace);
    }
    return data;
  }

  getTrace(source: MeterSource, dataType: string): BarChartDataTrace {
    return {
      x: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.facility.name }),
      y: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.utilitySummary.utilitySummaries.find(utility => { return utility.source == source })?.[dataType] }),
      width: this.facilitiesUtilitySummaries.map(dataItem => { return .5 }),
      name: source,
      type: 'bar',
      marker: {
        color: UtilityColors[source].color
      }
    }
  }

  getYAxisLabel(): string {
    if (this.graphType == 'cost') {
      return undefined;
    } else if (this.graphType == 'usage') {
      return this.account.energyUnit;
    } else if (this.graphType == 'locationEmissions' || this.graphType == 'marketEmissions') {
      return "tonne CO<sub>2</sub>";
    }
  }

  getPreffix(): string {
    if (this.graphType == 'cost') {
      return '$';
    }
    return undefined;
  }


}