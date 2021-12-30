import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
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


  @ViewChild('utilityCostBarChart', { static: false }) utilityCostBarChart: ElementRef;
  @ViewChild('utilityUsageBarChart', { static: false }) utilityUsageBarChart: ElementRef;
  @ViewChild('utilityEmissionsBarChart', { static: false }) utilityEmissionsBarChart: ElementRef;

  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngOnChanges(){
    this.drawCharts();
  }

  ngAfterViewInit() {
    this.drawCharts();
  }

  drawCharts(){
    this.drawCostChart();
    this.drawEnergyUseChart();
    this.drawEmissionsChart();
  }

  drawCostChart() {
    if (this.utilityCostBarChart) {
      let data = this.getData('costPastYear');
      var layout = {
        barmode: 'stack',
        showlegend: true,
        yaxis: {
          title: "$/yr",
          tickprefix: "$",
          automargin: true,
          // ticksuffix: ticksuffix
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
      this.plotlyService.newPlot(this.utilityCostBarChart.nativeElement, data, layout, config);
    }
  }

  drawEnergyUseChart() {
    if (this.utilityUsageBarChart) {
      let data = this.getData('consumptionPastYear');

      var layout = {
        barmode: 'stack',
        showlegend: true,
        yaxis: {
          title: this.account.energyUnit + '/yr',
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
      this.plotlyService.newPlot(this.utilityUsageBarChart.nativeElement, data, layout, config);
    }
  }

  drawEmissionsChart() {
    if (this.utilityEmissionsBarChart) {
      let data = this.getData('emissionsPastYear');

      var layout = {
        barmode: 'stack',
        showlegend: true,
        yaxis: {
          title: "tonne CO<sub>2</sub>",
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
      this.plotlyService.newPlot(this.utilityEmissionsBarChart.nativeElement, data, layout, config);
    }
  }

  getData(dataType: 'consumptionPastYear' | 'costPastYear' | 'emissionsPastYear'): Array<{
    x: Array<string>,
    y: Array<number>,
    name: 'Other Utility',
    type: 'bar',
    marker: {
      color: string
    }
  }> {
    let data = new Array();
    if (this.reportUtilityOptions.electricity) {
      data.push({
        x: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.facility.name }),
        y: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.utilitySummary.utilitySummaries.find(utility => { return utility.source == 'Electricity' })?.[dataType] }),
        name: 'Electricity',
        type: 'bar',
        marker: {
          color: UtilityColors.Electricity.color
        }
      });
    }
    if (this.reportUtilityOptions.naturalGas) {
      data.push({
        x: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.facility.name }),
        y: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.utilitySummary.utilitySummaries.find(utility => { return utility.source == 'Natural Gas' })?.[dataType] }),
        name: 'Natural Gas',
        type: 'bar',
        marker: {
          color: UtilityColors['Natural Gas'].color
        }
      })
    }
    if (this.reportUtilityOptions.otherFuels) {
      data.push({
        x: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.facility.name }),
        y: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.utilitySummary.utilitySummaries.find(utility => { return utility.source == 'Other Fuels' })?.[dataType] }),
        name: 'Other Fuels',
        type: 'bar',
        marker: {
          color: UtilityColors['Other Fuels'].color
        }
      })
    }
    if (this.reportUtilityOptions.otherEnergy) {
      data.push({
        x: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.facility.name }),
        y: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.utilitySummary.utilitySummaries.find(utility => { return utility.source == 'Other Energy' })?.[dataType] }),
        name: 'Other Energy',
        type: 'bar',
        marker: {
          color: UtilityColors['Other Energy'].color
        }
      })
    }
    if (this.reportUtilityOptions.water) {
      data.push({
        x: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.facility.name }),
        y: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.utilitySummary.utilitySummaries.find(utility => { return utility.source == 'Water' })?.[dataType] }),
        name: 'Water',
        type: 'bar',
        marker: {
          color: UtilityColors['Water'].color
        }
      })
    }
    if (this.reportUtilityOptions.wasteWater) {
      data.push({
        x: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.facility.name }),
        y: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.utilitySummary.utilitySummaries.find(utility => { return utility.source == 'Waste Water' })?.[dataType] }),
        name: 'Waste Water',
        type: 'bar',
        marker: {
          color: UtilityColors['Waste Water'].color
        }
      })
    }
    if (this.reportUtilityOptions.otherUtility) {
      data.push({
        x: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.facility.name }),
        y: this.facilitiesUtilitySummaries.map(dataItem => { return dataItem.utilitySummary.utilitySummaries.find(utility => { return utility.source == 'Other Utility' })?.[dataType] }),
        name: 'Other Utility',
        type: 'bar',
        marker: {
          color: UtilityColors['Other Utility'].color
        }
      })
    }
    return data;
  }


}
