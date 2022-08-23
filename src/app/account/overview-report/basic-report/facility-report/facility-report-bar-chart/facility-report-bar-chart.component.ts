import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { IdbFacility, MeterSource } from 'src/app/models/idb';
import { BarChartDataTrace, ReportOptions } from 'src/app/models/overview-report';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { OverviewReportService } from 'src/app/account/overview-report/overview-report.service';
import { VisualizationService } from 'src/app/shared/helper-services/visualization.service';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { CalanderizedMeter } from 'src/app/models/calanderization';

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
  @Input()
  sumByMonth: boolean;
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>;

  @ViewChild('utilityCostBarChart', { static: false }) utilityCostBarChart: ElementRef;
  @ViewChild('utilityUsageBarChart', { static: false }) utilityUsageBarChart: ElementRef;
  @ViewChild('utilityLocationEmissionsBarChart', { static: false }) utilityLocationEmissionsBarChart: ElementRef;
  @ViewChild('utilityMarketEmissionsBarChart', { static: false }) utilityMarketEmissionsBarChart: ElementRef;

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
    private plotlyService: PlotlyService,
    private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.printSub = this.overviewReportService.print.subscribe(val => {
      this.print = val;
    })
    this.setUtilityData();
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawLocationEmissionsChart();
    this.drawMarketEmissionsChart();
    this.drawCostChart();
    this.drawUsageChart();
  }

  setUtilityData() {
    if (this.reportOptions.electricity) {
      this.electricityData = this.getDataByUtility('Electricity', this.calanderizedMeters);
    } else {
      this.electricityData = [];
    }
    if (this.reportOptions.naturalGas) {
      this.naturalGasData = this.getDataByUtility('Natural Gas', this.calanderizedMeters);
    } else {
      this.naturalGasData = [];
    }
    if (this.reportOptions.otherFuels) {
      this.otherFuelsData = this.getDataByUtility('Other Fuels', this.calanderizedMeters);
    } else {
      this.otherFuelsData = [];
    }
    if (this.reportOptions.otherEnergy) {
      this.otherEnergyData = this.getDataByUtility('Other Energy', this.calanderizedMeters);
    } else {
      this.otherEnergyData = [];
    }
    if (this.reportOptions.water) {
      this.waterData = this.getDataByUtility('Water', this.calanderizedMeters);
    } else {
      this.waterData = [];
    }
    if (this.reportOptions.wasteWater) {
      this.wasteWaterData = this.getDataByUtility('Waste Water', this.calanderizedMeters);
    } else {
      this.wasteWaterData = [];
    }
    if (this.reportOptions.otherUtility) {
      this.otherUtilityData = this.getDataByUtility('Other Utility', this.calanderizedMeters);
    } else {
      this.otherUtilityData = [];
    }
  }

  getDataByUtility(utility: MeterSource, calanderizedMeters: Array<CalanderizedMeter>): Array<FacilityBarChartData> {
    let calanderizedMeter: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.source == utility });
    return this.visualizationService.getFacilityDashboardBarChartData(calanderizedMeter, this.sumByMonth, true);
  }

  drawLocationEmissionsChart() {
    if (this.utilityLocationEmissionsBarChart) {
      let traceData = this.getDataTraces('locationEmissions');
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

      this.plotlyService.newPlot(this.utilityLocationEmissionsBarChart.nativeElement, traceData, layout, config);
    }
  }

  drawMarketEmissionsChart() {
    if (this.utilityMarketEmissionsBarChart) {
      let traceData = this.getDataTraces('marketEmissions');
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

      this.plotlyService.newPlot(this.utilityMarketEmissionsBarChart.nativeElement, traceData, layout, config);
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

  getDataTraces(dataObj: 'energyUse' | 'marketEmissions' | 'locationEmissions' | 'energyCost'): Array<BarChartDataTrace> {
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

  getDataTrace(chartData: Array<FacilityBarChartData>, source: MeterSource, dataObj: 'energyUse' | 'locationEmissions' | 'marketEmissions' | 'energyCost'): BarChartDataTrace {
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
    if (this.sumByMonth) {
      return data.map(data => { return data.time })
    } else {
      return data.map(data => { return data.year })
    }
  }

  getLegend(): { orientation: "h" } {
    if (this.sumByMonth) {
      return undefined;
    } else {
      return { orientation: "h" };
    }
  }


}
