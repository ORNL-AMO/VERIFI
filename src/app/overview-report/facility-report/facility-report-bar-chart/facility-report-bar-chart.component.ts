import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { VisualizationService } from 'src/app/shared/helper-services/visualization.service';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { OverviewReportService, ReportOptions, ReportUtilityOptions } from '../../overview-report.service';

@Component({
  selector: 'app-facility-report-bar-chart',
  templateUrl: './facility-report-bar-chart.component.html',
  styleUrls: ['./facility-report-bar-chart.component.css']
})
export class FacilityReportBarChartComponent implements OnInit {
  @Input()
  facility: IdbFacility;



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


  reportUtilityOptions: ReportUtilityOptions;
  reportUtilityOptionsSub: Subscription;
  constructor(private overviewReportService: OverviewReportService, private visualizationService: VisualizationService,
    private utilityMeterDbService: UtilityMeterdbService, private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngOnDestroy() {
    this.reportUtilityOptionsSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.reportUtilityOptionsSub = this.overviewReportService.reportUtilityOptions.subscribe(reportUtilityOptions => {
      this.reportUtilityOptions = reportUtilityOptions;
      this.setUtilityData();
    })
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
    this.drawEmissionsChart();
    this.drawCostChart();
    this.drawUsageChart();
  }

  getDataByUtility(utility: MeterSource, facilityMeters: Array<IdbUtilityMeter>): Array<FacilityBarChartData> {
    let filteredMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == utility });
    return this.visualizationService.getFacilityBarChartData(filteredMeters, false, true, false);
  }

  drawEmissionsChart() {
    if (this.utilityEmissionsBarChart) {
      let traceData = new Array();
      if (this.electricityData.length != 0) {
        let trace = {
          x: this.electricityData.map(data => { return data.time }),
          y: this.electricityData.map(data => { return data.emissions / 1000 }),
          name: 'Electricity',
          type: 'bar',
          marker: {
            color: UtilityColors.Electricity.color,
          }
        }
        traceData.push(trace);
      }
      if (this.naturalGasData.length != 0) {
        let trace = {
          x: this.naturalGasData.map(data => { return data.time }),
          y: this.naturalGasData.map(data => { return data.emissions / 1000 }),
          name: 'Natural Gas',
          type: 'bar',
          marker: {
            color: UtilityColors['Natural Gas'].color
          }
        };
        traceData.push(trace);
      }
      if (this.otherFuelsData.length != 0) {
        let trace = {
          x: this.otherFuelsData.map(data => { return data.time }),
          y: this.otherFuelsData.map(data => { return data.emissions / 1000 }),
          name: 'Other Fuels',
          type: 'bar',
          marker: {
            color: UtilityColors['Other Fuels'].color
          }
        };
        traceData.push(trace);
      }
      if (this.waterData.length != 0) {
        let trace = {
          x: this.waterData.map(data => { return data.time }),
          y: this.waterData.map(data => { return data.emissions / 1000 }),
          name: 'Water',
          type: 'bar',
          marker: {
            color: UtilityColors['Water'].color
          }
        };
        traceData.push(trace);
      }
      if (this.wasteWaterData.length != 0) {
        let trace = {
          x: this.wasteWaterData.map(data => { return data.time }),
          y: this.wasteWaterData.map(data => { return data.emissions / 1000 }),
          name: 'Waste Water',
          type: 'bar',
          marker: {
            color: UtilityColors['Waste Water'].color
          }
        };
        traceData.push(trace);
      }
      if (this.otherUtilityData.length != 0) {
        let trace = {
          x: this.otherUtilityData.map(data => { return data.time }),
          y: this.otherUtilityData.map(data => { return data.emissions / 1000 }),
          name: 'Other Utility',
          type: 'bar',
          marker: {
            color: UtilityColors['Other Utility'].color
          }
        };
        traceData.push(trace);
      }
      if (this.otherEnergyData.length != 0) {
        let trace = {
          x: this.otherUtilityData.map(data => { return data.time }),
          y: this.otherUtilityData.map(data => { return data.emissions / 1000 }),
          name: 'Other Energy',
          type: 'bar',
          marker: {
            color: UtilityColors['Other Energy'].color
          }
        };
        traceData.push(trace);
      }
      var layout = {
        barmode: 'group',
        // title: {
        //   text: "Annual Emissions",
        //   font: {
        //     size: 24
        //   },
        // },
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
      let traceData = new Array();
      if (this.electricityData.length != 0) {
        let trace = {
          x: this.electricityData.map(data => { return data.time }),
          y: this.electricityData.map(data => { return data.energyCost }),
          name: 'Electricity',
          type: 'bar',
          marker: {
            color: UtilityColors.Electricity.color,
          }
        }
        traceData.push(trace);
      }
      if (this.naturalGasData.length != 0) {
        let trace = {
          x: this.naturalGasData.map(data => { return data.time }),
          y: this.naturalGasData.map(data => { return data.energyCost }),
          name: 'Natural Gas',
          type: 'bar',
          marker: {
            color: UtilityColors['Natural Gas'].color
          }
        };
        traceData.push(trace);
      }
      if (this.otherFuelsData.length != 0) {
        let trace = {
          x: this.otherFuelsData.map(data => { return data.time }),
          y: this.otherFuelsData.map(data => { return data.energyCost }),
          name: 'Other Fuels',
          type: 'bar',
          marker: {
            color: UtilityColors['Other Fuels'].color
          }
        };
        traceData.push(trace);
      }
      if (this.waterData.length != 0) {
        let trace = {
          x: this.waterData.map(data => { return data.time }),
          y: this.waterData.map(data => { return data.energyCost }),
          name: 'Water',
          type: 'bar',
          marker: {
            color: UtilityColors['Water'].color
          }
        };
        traceData.push(trace);
      }
      if (this.wasteWaterData.length != 0) {
        let trace = {
          x: this.wasteWaterData.map(data => { return data.time }),
          y: this.wasteWaterData.map(data => { return data.energyCost }),
          name: 'Waste Water',
          type: 'bar',
          marker: {
            color: UtilityColors['Waste Water'].color
          }
        };
        traceData.push(trace);
      }
      if (this.otherUtilityData.length != 0) {
        let trace = {
          x: this.otherUtilityData.map(data => { return data.time }),
          y: this.otherUtilityData.map(data => { return data.energyCost }),
          name: 'Other Utility',
          type: 'bar',
          marker: {
            color: UtilityColors['Other Utility'].color
          }
        };
        traceData.push(trace);
      }
      if (this.otherEnergyData.length != 0) {
        let trace = {
          x: this.otherUtilityData.map(data => { return data.time }),
          y: this.otherUtilityData.map(data => { return data.energyCost }),
          name: 'Other Energy',
          type: 'bar',
          marker: {
            color: UtilityColors['Other Energy'].color
          }
        };
        traceData.push(trace);
      }
      var layout = {
        barmode: 'group',
        // title: {
        //   text: 'Annual Costs',
        //   font: {
        //     size: 24
        //   },
        // },
        yaxis: {
          tickprefix: "$",
          hoverformat: ",.2f",
          // title: {
          //   text: '$'
          // }
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
      let traceData = new Array();
      if (this.electricityData.length != 0) {
        let trace = {
          x: this.electricityData.map(data => { return data.time }),
          y: this.electricityData.map(data => { return data.energyUse }),
          name: 'Electricity',
          type: 'bar',
          marker: {
            color: UtilityColors.Electricity.color,
          }
        }
        traceData.push(trace);
      }
      if (this.naturalGasData.length != 0) {
        let trace = {
          x: this.naturalGasData.map(data => { return data.time }),
          y: this.naturalGasData.map(data => { return data.energyUse }),
          name: 'Natural Gas',
          type: 'bar',
          marker: {
            color: UtilityColors['Natural Gas'].color
          }
        };
        traceData.push(trace);
      }
      if (this.otherFuelsData.length != 0) {
        let trace = {
          x: this.otherFuelsData.map(data => { return data.time }),
          y: this.otherFuelsData.map(data => { return data.energyUse }),
          name: 'Other Fuels',
          type: 'bar',
          marker: {
            color: UtilityColors['Other Fuels'].color
          }
        };
        traceData.push(trace);
      }
      if (this.waterData.length != 0) {
        let trace = {
          x: this.waterData.map(data => { return data.time }),
          y: this.waterData.map(data => { return data.energyUse }),
          name: 'Water',
          type: 'bar',
          marker: {
            color: UtilityColors['Water'].color
          }
        };
        traceData.push(trace);
      }
      if (this.wasteWaterData.length != 0) {
        let trace = {
          x: this.wasteWaterData.map(data => { return data.time }),
          y: this.wasteWaterData.map(data => { return data.energyUse }),
          name: 'Waste Water',
          type: 'bar',
          marker: {
            color: UtilityColors['Waste Water'].color
          }
        };
        traceData.push(trace);
      }
      if (this.otherUtilityData.length != 0) {
        let trace = {
          x: this.otherUtilityData.map(data => { return data.time }),
          y: this.otherUtilityData.map(data => { return data.energyUse }),
          name: 'Other Utility',
          type: 'bar',
          marker: {
            color: UtilityColors['Other Utility'].color
          }
        };
        traceData.push(trace);
      }
      if (this.otherEnergyData.length != 0) {
        let trace = {
          x: this.otherUtilityData.map(data => { return data.time }),
          y: this.otherUtilityData.map(data => { return data.energyUse }),
          name: 'Other Energy',
          type: 'bar',
          marker: {
            color: UtilityColors['Other Energy'].color
          }
        };
        traceData.push(trace);
      }
      var layout = {
        barmode: 'group',
        // title: {
        //   text: "Annual Consumption",
        //   font: {
        //     size: 24
        //   },
        // },
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


}
