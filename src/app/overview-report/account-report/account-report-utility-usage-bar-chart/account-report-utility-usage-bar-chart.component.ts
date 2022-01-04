import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbAccount, IdbFacility, MeterSource } from 'src/app/models/idb';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { ReportUtilityOptions, ReportUtilitySummary } from '../../overview-report.service';

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
  reportUtilityOptions: ReportUtilityOptions;
  @Input()
  graphType: 'cost' | 'emissions' | 'usage';

  @ViewChild('utilityBarChart', { static: false }) utilityBarChart: ElementRef;
  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    this.drawChart();
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

  getData(): Array<DataTrace> {
    let dataType: 'consumptionPastYear' | 'costPastYear' | 'emissionsPastYear';
    if (this.graphType == 'cost') {
      dataType = 'costPastYear'
    } else if (this.graphType == 'usage') {
      dataType = 'consumptionPastYear';
    } else if (this.graphType == 'emissions') {
      dataType = 'emissionsPastYear';
    }

    let data: Array<DataTrace> = new Array();
    if (this.reportUtilityOptions.electricity) {
      let trace: DataTrace = this.getTrace('Electricity', dataType);
      data.push(trace);
    }
    if (this.reportUtilityOptions.naturalGas) {
      let trace: DataTrace = this.getTrace('Natural Gas', dataType);
      data.push(trace);
    }
    if (this.reportUtilityOptions.otherFuels) {
      let trace: DataTrace = this.getTrace('Other Fuels', dataType);
      data.push(trace);
    }
    if (this.reportUtilityOptions.otherEnergy) {
      let trace: DataTrace = this.getTrace('Other Energy', dataType);
      data.push(trace);
    }
    if (this.reportUtilityOptions.water) {
      let trace: DataTrace = this.getTrace('Water', dataType);
      data.push(trace);
    }
    if (this.reportUtilityOptions.wasteWater) {
      let trace: DataTrace = this.getTrace('Waste Water', dataType);
      data.push(trace);
    }
    if (this.reportUtilityOptions.otherUtility) {
      let trace: DataTrace = this.getTrace('Other Utility', dataType);
      data.push(trace);
    }
    return data;
  }

  getTrace(source: MeterSource, dataType: string): DataTrace {
    return {
      x: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.facility.name }),
      y: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.utilitySummary.utilitySummaries.find(utility => { return utility.source == source })?.[dataType] }),
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
    } else if (this.graphType == 'emissions') {
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


export interface DataTrace {
  x: Array<string>,
  y: Array<number>,
  name: string,
  type: string,
  marker: {
    color: string
  }
}