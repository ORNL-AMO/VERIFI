import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { BarChartDataTrace, ReportOptions } from 'src/app/models/overview-report';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { OverviewReportService } from 'src/app/overview-report/overview-report.service';
import { VisualizationService } from 'src/app/shared/helper-services/visualization.service';
import { UtilityColors } from 'src/app/shared/utilityColors';

@Component({
  selector: 'app-facility-report-bar-chart',
  templateUrl: './facility-report-bar-chart.component.html',
  styleUrls: ['./facility-report-bar-chart.component.css']
})
export class FacilityReportBarChartComponent implements OnInit {
  @Input()
  facility: IdbFacility;
  @Input()
  reportOptions: ReportOptions;

  @ViewChild('utilityCostBarChart', { static: false }) utilityCostBarChart: ElementRef;
  @ViewChild('utilityUsageBarChart', { static: false }) utilityUsageBarChart: ElementRef;
  @ViewChild('utilityEmissionsBarChart', { static: false }) utilityEmissionsBarChart: ElementRef;

  electricityData: Array<FacilityBarChartData>;
  naturalGasData: Array<FacilityBarChartData>;
  otherFuelsData: Array<FacilityBarChartData>;
  otherEnergyData: Array<FacilityBarChartData>;
  waterData: Array<FacilityBarChartData>;
  wasteWaterData: Array<FacilityBarChartData>;
  otherUtilityData: Array<FacilityBarChartData>;

  print: boolean;
  printSub: Subscription;
  constructor(private visualizationService: VisualizationService,
    private utilityMeterDbService: UtilityMeterdbService, private plotlyService: PlotlyService,
    private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.printSub = this.overviewReportService.print.subscribe(val => {
      this.print = val;
    })
    this.setUtilityData();
  }

  ngOnDestroy(){
    this.printSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawEmissionsChart();
    this.drawCostChart();
    this.drawUsageChart();
  }

  setUtilityData() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.id });
    if (this.reportOptions.electricity) {
      this.electricityData = this.getDataByUtility('Electricity', facilityMeters);
    } else {
      this.electricityData = [];
    }
    if (this.reportOptions.naturalGas) {
      this.naturalGasData = this.getDataByUtility('Natural Gas', facilityMeters);
    } else {
      this.naturalGasData = [];
    }
    if (this.reportOptions.otherFuels) {
      this.otherFuelsData = this.getDataByUtility('Other Fuels', facilityMeters);
    } else {
      this.otherFuelsData = [];
    }
    if (this.reportOptions.otherEnergy) {
      this.otherEnergyData = this.getDataByUtility('Other Energy', facilityMeters);
    } else {
      this.otherEnergyData = [];
    }
    if (this.reportOptions.water) {
      this.waterData = this.getDataByUtility('Water', facilityMeters);
    } else {
      this.waterData = [];
    }
    if (this.reportOptions.wasteWater) {
      this.wasteWaterData = this.getDataByUtility('Waste Water', facilityMeters);
    } else {
      this.wasteWaterData = [];
    }
    if (this.reportOptions.otherUtility) {
      this.otherUtilityData = this.getDataByUtility('Other Utility', facilityMeters);
    } else {
      this.otherUtilityData = [];
    }
  }

  getDataByUtility(utility: MeterSource, facilityMeters: Array<IdbUtilityMeter>): Array<FacilityBarChartData> {
    let filteredMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == utility });
    return this.visualizationService.getFacilityBarChartData(filteredMeters, this.reportOptions.annualGraphsByMonth, true, false, this.reportOptions);
  }

  drawEmissionsChart() {
    if (this.utilityEmissionsBarChart) {
      let traceData = this.getDataTraces('emissions');
      var layout = {
        barmode: 'group',
        yaxis: {
          hoverformat: ",.2f",
          title: {
            text: 'tonne CO<sub>2</sub>'
          }
        },
        margin: { t: 10 },
        legend: this.getLegend(),
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };

      this.plotlyService.newPlot(this.utilityEmissionsBarChart.nativeElement, traceData, layout, config);
    }
  }

  drawCostChart() {
    if (this.utilityCostBarChart) {
      let traceData = this.getDataTraces('energyCost');
      var layout = {
        barmode: 'group',
        yaxis: {
          tickprefix: "$",
          hoverformat: ",.2f",
        },
        margin: { t: 10 },
        legend: this.getLegend(),
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };

      this.plotlyService.newPlot(this.utilityCostBarChart.nativeElement, traceData, layout, config);
    }
  }

  drawUsageChart() {
    if (this.utilityUsageBarChart) {
      let traceData: Array<BarChartDataTrace> = this.getDataTraces('energyUse');
      var layout = {
        barmode: 'group',
        yaxis: {
          hoverformat: ",.2f",
          title: {
            text: this.facility.energyUnit
          }
        },
        margin: { t: 10 },
        legend: this.getLegend(),
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };

      this.plotlyService.newPlot(this.utilityUsageBarChart.nativeElement, traceData, layout, config);
    }
  }

  getDataTraces(dataObj: 'energyUse' | 'emissions' | 'energyCost'): Array<BarChartDataTrace> {
    let traceData: Array<BarChartDataTrace> = new Array();
    if (this.electricityData.length != 0) {
      let trace: BarChartDataTrace = this.getDataTrace(this.electricityData, 'Electricity', dataObj);
      traceData.push(trace)
    }
    if (this.naturalGasData.length != 0) {
      let trace: BarChartDataTrace = this.getDataTrace(this.naturalGasData, 'Natural Gas', dataObj);
      traceData.push(trace)
    }
    if (this.otherFuelsData.length != 0) {
      let trace: BarChartDataTrace = this.getDataTrace(this.otherFuelsData, 'Other Fuels', dataObj);
      traceData.push(trace);
    }
    if (this.waterData.length != 0) {
      let trace: BarChartDataTrace = this.getDataTrace(this.waterData, 'Water', dataObj);
      traceData.push(trace);
    }
    if (this.wasteWaterData.length != 0) {
      let trace: BarChartDataTrace = this.getDataTrace(this.wasteWaterData, 'Waste Water', dataObj);
      traceData.push(trace);
    }
    if (this.otherUtilityData.length != 0) {
      let trace: BarChartDataTrace = this.getDataTrace(this.otherUtilityData, 'Other Utility', dataObj);
      traceData.push(trace);
    }
    if (this.otherEnergyData.length != 0) {
      let trace: BarChartDataTrace = this.getDataTrace(this.otherEnergyData, 'Other Energy', dataObj);
      traceData.push(trace);
    }
    return traceData;
  }

  getDataTrace(chartData: Array<FacilityBarChartData>, source: MeterSource, dataObj: 'energyUse' | 'emissions' | 'energyCost'): BarChartDataTrace {
    return {
      x: this.getXAxisValues(chartData),
      y: chartData.map(data => { return data[dataObj] }),
      name: source,
      type: 'bar',
      marker: {
        color: UtilityColors[source].color,
      }
    }
  }

  getXAxisValues(data: Array<FacilityBarChartData>): Array<string | number> {
    if (this.reportOptions.annualGraphsByMonth) {
      return data.map(data => { return data.time })
    } else {
      return data.map(data => { return data.year })
    }
  }

  getLegend(): { orientation: "h" } {
    if (this.reportOptions.annualGraphsByMonth) {
      return undefined;
    } else {
      return { orientation: "h" };
    }
  }


}
