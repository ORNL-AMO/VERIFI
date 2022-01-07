import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { BarChartDataTrace, ReportUtilityOptions } from 'src/app/models/overview-report';
import { FacilityBarChartData } from 'src/app/models/visualization';
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
  reportUtilityOptions: ReportUtilityOptions;

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

  constructor(private visualizationService: VisualizationService,
    private utilityMeterDbService: UtilityMeterdbService, private plotlyService: PlotlyService) { }

  ngOnInit(): void {
    this.setUtilityData();
  }

  ngAfterViewInit(){
    this.drawEmissionsChart();
    this.drawCostChart();
    this.drawUsageChart();
  }

  setUtilityData() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.id });
    if (this.reportUtilityOptions.electricity) {
      this.electricityData = this.getDataByUtility('Electricity', facilityMeters);
    } else {
      this.electricityData = [];
    }
    if (this.reportUtilityOptions.naturalGas) {
      this.naturalGasData = this.getDataByUtility('Natural Gas', facilityMeters);
    } else {
      this.naturalGasData = [];
    }
    if (this.reportUtilityOptions.otherFuels) {
      this.otherFuelsData = this.getDataByUtility('Other Fuels', facilityMeters);
    } else {
      this.otherFuelsData = [];
    }
    if (this.reportUtilityOptions.otherEnergy) {
      this.otherEnergyData = this.getDataByUtility('Other Energy', facilityMeters);
    } else {
      this.otherEnergyData = [];
    }
    if (this.reportUtilityOptions.water) {
      this.waterData = this.getDataByUtility('Water', facilityMeters);
    } else {
      this.waterData = [];
    }
    if (this.reportUtilityOptions.wasteWater) {
      this.wasteWaterData = this.getDataByUtility('Waste Water', facilityMeters);
    } else {
      this.wasteWaterData = [];
    }
    if (this.reportUtilityOptions.otherUtility) {
      this.otherUtilityData = this.getDataByUtility('Other Utility', facilityMeters);
    } else {
      this.otherUtilityData = [];
    }
  }

  getDataByUtility(utility: MeterSource, facilityMeters: Array<IdbUtilityMeter>): Array<FacilityBarChartData> {
    let filteredMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == utility });
    return this.visualizationService.getFacilityBarChartData(filteredMeters, false, true, false);
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
        legend: {
          orientation: "h"
        },
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
        legend: {
          orientation: "h"
        },
        margin: { t: 10 }
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
        legend: {
          orientation: "h"
        },
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
      x: chartData.map(data => { return data.time }),
      y: chartData.map(data => { return data[dataObj] }),
      name: source,
      type: 'bar',
      marker: {
        color: UtilityColors[source].color,
      }
    }
  }

}
