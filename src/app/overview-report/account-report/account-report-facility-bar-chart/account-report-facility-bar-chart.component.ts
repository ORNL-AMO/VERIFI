import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { VisualizationService } from 'src/app/shared/helper-services/visualization.service';
import { OverviewReportService, ReportOptions, ReportUtilityOptions } from '../../overview-report.service';

@Component({
  selector: 'app-account-report-facility-bar-chart',
  templateUrl: './account-report-facility-bar-chart.component.html',
  styleUrls: ['./account-report-facility-bar-chart.component.css']
})
export class AccountReportFacilityBarChartComponent implements OnInit {
  @Input()
  account: IdbAccount;


  @ViewChild('facilityCostBarChart', { static: false }) facilityCostBarChart: ElementRef;
  @ViewChild('facilityUsageBarChart', { static: false }) facilityUsageBarChart: ElementRef;
  @ViewChild('facilityEmissionsBarChart', { static: false }) facilityEmissionsDonut: ElementRef;

  reportUtilityOptions: ReportUtilityOptions;
  reportUtilityOptionsSub: Subscription;
  reportOptions: ReportOptions;
  chartData: Array<{
    facility: IdbFacility,
    data: Array<FacilityBarChartData>
  }>
  constructor(private visualizationService: VisualizationService, private overviewReportService: OverviewReportService,
    private utilityMeterDbService: UtilityMeterdbService, private plotlyService: PlotlyService) { }

  ngOnInit(): void {
    this.reportUtilityOptionsSub = this.overviewReportService.reportUtilityOptions.subscribe(val => {
      this.reportUtilityOptions = val;
      this.setReportData();
      this.drawCharts();
    });
  }

  ngOnDestroy() {
    this.reportUtilityOptionsSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawCharts();
  }

  drawCharts() {
    this.drawCostBarChart();
    this.drawEnergyUseBarChart();
    this.drawEmissionsBarChart();
  }

  drawCostBarChart() {
    if (this.facilityCostBarChart) {
      let traceData = new Array();

      this.chartData.forEach(dataItem => {
        let trace = {
          x: dataItem.data.map(data => { return data.year }),
          y: dataItem.data.map(data => { return data.energyCost }),
          name: dataItem.facility.name,
          type: 'bar',
          marker: {
            color: dataItem.facility.color,
          }
        }
        traceData.push(trace);
      });



      var layout = {
        barmode: 'group',
        // title: {
        //   text: 'Annual Facility Costs',
        //   font: {
        //     size: 24
        //   },
        // },
        yaxis: {
          tickprefix: '$',
          // title: {
          //   text: '$',
          // },
          hoverformat: ",.2f"
        },
        legend: {
          orientation: "h"
        },
        clickmode: "none",
        margin: { t: 10 }
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };

      this.plotlyService.newPlot(this.facilityCostBarChart.nativeElement, traceData, layout, config);
    }
  }

  drawEnergyUseBarChart() {
    if (this.facilityUsageBarChart) {
      let traceData = new Array();
      this.chartData.forEach(dataItem => {
        let trace = {
          x: dataItem.data.map(data => { return data.year }),
          y: dataItem.data.map(data => { return data.energyUse }),
          name: dataItem.facility.name,
          type: 'bar',
          marker: {
            color: dataItem.facility.color,
          }
        }
        traceData.push(trace);
      });



      var layout = {
        barmode: 'group',
        // title: {
        //   text: 'Annual Facility Consumption',
        //   font: {
        //     size: 24
        //   },
        // },
        yaxis: {
          title: {
            text: this.account.energyUnit,
          },
          hoverformat: ",.2f"
        },
        legend: {
          orientation: "h"
        },
        clickmode: "none",
        margin: { t: 10 }
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };

      this.plotlyService.newPlot(this.facilityUsageBarChart.nativeElement, traceData, layout, config);
    }
  }

  drawEmissionsBarChart() {
    if (this.facilityEmissionsDonut) {
      let traceData = new Array();
      this.chartData.forEach(dataItem => {
        let trace = {
          x: dataItem.data.map(data => { return data.year }),
          y: dataItem.data.map(data => { return data.emissions / 1000 }),
          name: dataItem.facility.name,
          type: 'bar',
          marker: {
            color: dataItem.facility.color,
          }
        }
        traceData.push(trace);
      });

      var layout = {
        barmode: 'group',
        // title: {
        //   text: 'Annual Facility Emissions',
        //   font: {
        //     size: 24
        //   }
        // },
        yaxis: {
          title: {
            text: "tonne CO<sub>2</sub>",
          },
          hoverformat: ",.2f"
        },
        legend: {
          orientation: "h"
        },
        clickmode: "none",
        margin: { t: 10 }
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };

      this.plotlyService.newPlot(this.facilityEmissionsDonut.nativeElement, traceData, layout, config);
    }
  }


  setReportData() {
    this.chartData = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilities: Array<IdbFacility> = this.overviewReportService.reportOptions.getValue().facilities;
    let selectedSource: Array<MeterSource> = this.getSelectedSources();
    facilities.forEach(facility => {
      if (facility.selected) {
        let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => {
          return meter.facilityId == facility.id && selectedSource.includes(meter.source);
        });
        let facilityBarChartData: Array<FacilityBarChartData> = this.visualizationService.getFacilityBarChartData(facilityMeters, false, true, true);
        this.chartData.push({
          facility: facility,
          data: facilityBarChartData
        });
      }
    });
  }

  getSelectedSources(): Array<MeterSource> {
    let sources: Array<MeterSource> = new Array();
    if (this.reportUtilityOptions.electricity) {
      sources.push('Electricity');
    }
    if (this.reportUtilityOptions.naturalGas) {
      sources.push('Natural Gas');
    }
    if (this.reportUtilityOptions.otherFuels) {
      sources.push('Other Fuels');
    }
    if (this.reportUtilityOptions.otherEnergy) {
      sources.push('Other Energy');
    }
    if (this.reportUtilityOptions.water) {
      sources.push('Water');
    }
    if (this.reportUtilityOptions.wasteWater) {
      sources.push('Waste Water');
    }
    if (this.reportUtilityOptions.otherUtility) {
      sources.push('Other Utility');
    }
    return sources;
  }

}
