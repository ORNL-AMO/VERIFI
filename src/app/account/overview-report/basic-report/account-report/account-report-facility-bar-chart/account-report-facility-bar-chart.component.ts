import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { VisualizationService } from 'src/app/shared/helper-services/visualization.service';
import { OverviewReportService } from '../../../overview-report.service';

@Component({
  selector: 'app-account-report-facility-bar-chart',
  templateUrl: './account-report-facility-bar-chart.component.html',
  styleUrls: ['./account-report-facility-bar-chart.component.css']
})
export class AccountReportFacilityBarChartComponent implements OnInit {
  @Input()
  account: IdbAccount;
  @Input()
  reportOptions: ReportOptions;
  @Input()
  sumByMonth: boolean;

  @ViewChild('facilityCostBarChart', { static: false }) facilityCostBarChart: ElementRef;
  @ViewChild('facilityUsageBarChart', { static: false }) facilityUsageBarChart: ElementRef;
  @ViewChild('facilityEmissionsBarChart', { static: false }) facilityEmissionsDonut: ElementRef;

  chartData: Array<{
    facility: IdbFacility,
    data: Array<FacilityBarChartData>
  }>
  print: boolean;
  printSub: Subscription;
  constructor(private visualizationService: VisualizationService, private overviewReportService: OverviewReportService,
    private utilityMeterDbService: UtilityMeterdbService, private plotlyService: PlotlyService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.printSub = this.overviewReportService.print.subscribe(val => {
      this.print = val;
    })
    this.setReportData();
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
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
          x: this.getXAxisValues(dataItem.data),
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
        yaxis: {
          tickprefix: '$',
          hoverformat: ",.2f"
        },
        legend: this.getLegend(),
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
          x: this.getXAxisValues(dataItem.data),
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
        yaxis: {
          title: {
            text: this.account.energyUnit,
          },
          hoverformat: ",.2f"
        },
        legend: this.getLegend(),
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
          x: this.getXAxisValues(dataItem.data),
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
        yaxis: {
          title: {
            text: "tonne CO<sub>2</sub>",
          },
          hoverformat: ",.2f"
        },
        legend: this.getLegend(),
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


  getXAxisValues(data: Array<FacilityBarChartData>): Array<string | number> {
    if (this.sumByMonth) {
      return data.map(data => { return data.time })
    } else {
      return data.map(data => { return data.year })
    }
  }

  setReportData() {
    this.chartData = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let selectedSource: Array<MeterSource> = this.overviewReportService.getSelectedSources(this.reportOptions);
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.reportOptions.facilities.forEach(facility => {
      if (facility.selected) {
        let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => {
          return meter.facilityId == facility.facilityId && selectedSource.includes(meter.source);
        });
        let facilityBarChartData: Array<FacilityBarChartData> = this.visualizationService.getFacilityBarChartData(facilityMeters, this.sumByMonth, true, true, this.reportOptions);
        let selectedFacility: IdbFacility = accountFacilites.find(accountFacility => { return accountFacility.guid == facility.facilityId })
        this.chartData.push({
          facility: selectedFacility,
          data: facilityBarChartData
        });
      }
    });
  }


  getLegend(): { orientation: "h" } {
    if (this.sumByMonth) {
      return undefined;
    } else {
      return { orientation: "h" };
    }
  }
}
