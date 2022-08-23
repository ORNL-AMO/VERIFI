
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, MeterSource } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { VisualizationService } from '../../../shared/helper-services/visualization.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';

@Component({
  selector: 'app-facility-stacked-area-chart',
  templateUrl: './facility-stacked-area-chart.component.html',
  styleUrls: ['./facility-stacked-area-chart.component.css']
})
export class FacilityStackedAreaChartComponent implements OnInit {

  @ViewChild('stackedAreaChart', { static: false }) stackedAreaChart: ElementRef;

  electricityData: Array<FacilityBarChartData>;
  naturalGasData: Array<FacilityBarChartData>;
  otherFuelsData: Array<FacilityBarChartData>;
  waterData: Array<FacilityBarChartData>;
  wasteWaterData: Array<FacilityBarChartData>;
  otherUtilityData: Array<FacilityBarChartData>;
  sumByMonth: boolean = false;
  removeIncompleteYears: boolean = true;

  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizedMetersSub: Subscription;
  graphDisplaySub: Subscription;
  graphDisplay: "cost" | "usage" | "emissions";
  emissionsDisplay: "location" | "market";
  emissionsDisplaySub: Subscription;
  constructor(private plotlyService: PlotlyService, private vizualizationService: VisualizationService,
    private dashboardService: DashboardService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.calanderizedMetersSub = this.dashboardService.calanderizedFacilityMeters.subscribe(cMeters => {
      this.calanderizedMeters = cMeters;
      this.setUtilityData();
    })
    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(value => {
      this.graphDisplay = value;
      this.setUtilityData();
    });
    this.emissionsDisplaySub = this.dashboardService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
      if(this.graphDisplay == 'emissions'){
        this.setUtilityData();
      }
    })
  }

  ngOnDestroy() {
    this.calanderizedMetersSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

  ngAfterViewInit() {
    this.setUtilityData();
  }

  setUtilityData() {
    let isGraphDisplayValid: boolean = this.checkGraphDisplay();
    if (this.calanderizedMeters && this.calanderizedMeters.length != 0 && isGraphDisplayValid && this.stackedAreaChart) {
      this.electricityData = this.getDataByUtility('Electricity', this.calanderizedMeters);
      this.naturalGasData = this.getDataByUtility('Natural Gas', this.calanderizedMeters);
      this.otherFuelsData = this.getDataByUtility('Other Fuels', this.calanderizedMeters);
      this.waterData = this.getDataByUtility('Water', this.calanderizedMeters);
      this.wasteWaterData = this.getDataByUtility('Waste Water', this.calanderizedMeters);
      this.otherUtilityData = this.getDataByUtility('Other Utility', this.calanderizedMeters);
      this.drawChart();
    }
  }

  drawChart() {
    if (this.stackedAreaChart) {
      let traceData = new Array();
      let yDataProperty: "energyCost" | "energyUse" | "marketEmissions" | "locationEmissions";
      let yaxisTitle: string;
      let tickprefix: string;
      let hoverformat: string;
      if (this.graphDisplay == "cost") {
        yaxisTitle = 'Utility Cost';
        yDataProperty = "energyCost";
        tickprefix = "$";
        hoverformat = '$,.2f';
      } else if (this.graphDisplay == "usage") {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        yaxisTitle = "Utility Usage (" + selectedFacility.energyUnit + ")";
        yDataProperty = "energyUse";
        tickprefix = "";
        hoverformat = ",.2f";
      } else if (this.graphDisplay == "emissions") {
        if(this.emissionsDisplay == 'location'){
          yDataProperty = "marketEmissions";
        }else{
          yDataProperty = "locationEmissions";
        }
        yaxisTitle = "Emissions (kg CO<sub>2</sub>)";
        tickprefix = "";
        hoverformat = ",.2f";
      }


      if (this.electricityData.length != 0) {
        let trace = {
          x: this.electricityData.map(data => { return data.time }),
          y: this.electricityData.map(data => { return data[yDataProperty] }),
          name: 'Electricity',
          stackgroup: 'one',
          marker: {
            color: UtilityColors.Electricity.color,
          }
        }
        traceData.push(trace);
      }
      if (this.naturalGasData.length != 0) {
        let trace = {
          x: this.naturalGasData.map(data => { return data.time }),
          y: this.naturalGasData.map(data => { return data[yDataProperty] }),
          name: 'Natural Gas',
          stackgroup: 'one',
          marker: {
            color: UtilityColors['Natural Gas'].color
          }
        };
        traceData.push(trace);
      }
      if (this.otherFuelsData.length != 0) {
        let trace = {
          x: this.otherFuelsData.map(data => { return data.time }),
          y: this.otherFuelsData.map(data => { return data[yDataProperty] }),
          name: 'Other Fuels',
          stackgroup: 'one',
          marker: {
            color: UtilityColors['Other Fuels'].color
          }
        };
        traceData.push(trace);
      }
      if (this.waterData.length != 0) {
        let trace = {
          x: this.waterData.map(data => { return data.time }),
          y: this.waterData.map(data => { return data[yDataProperty] }),
          name: 'Water',
          stackgroup: 'one',
          marker: {
            color: UtilityColors['Water'].color
          }
        };
        traceData.push(trace);
      }
      if (this.wasteWaterData.length != 0) {
        let trace = {
          x: this.wasteWaterData.map(data => { return data.time }),
          y: this.wasteWaterData.map(data => { return data[yDataProperty] }),
          name: 'Waste Water',
          stackgroup: 'one',
          marker: {
            color: UtilityColors['Waste Water'].color
          }
        };
        traceData.push(trace);
      }
      if (this.otherUtilityData.length != 0) {
        let trace = {
          x: this.otherUtilityData.map(data => { return data.time }),
          y: this.otherUtilityData.map(data => { return data[yDataProperty] }),
          name: 'Other Utility',
          stackgroup: 'one',
          marker: {
            color: UtilityColors['Other Utility'].color
          }
        };
        traceData.push(trace);
      }

      var layout = {
        barmode: 'group',
        // title: {
        //   text: 'Utility Costs',
        //   font: {
        //     size: 24
        //   },
        // },
        xaxis: {
          autotick: false,
          // title: {
          //   text: 'Year',
          //   font: {
          //     size: 18
          //   },
          // },
        },
        yaxis: {
          title: {
            text: yaxisTitle,
            tickprefix: tickprefix
            //   font: {
            //     size: 18
            //   },
          },
          hoverformat: hoverformat
        }
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };
      this.plotlyService.newPlot(this.stackedAreaChart.nativeElement, traceData, layout, config);
    }
  }

  getDataByUtility(utility: MeterSource, calanderizedMeters: Array<CalanderizedMeter>): Array<FacilityBarChartData> {
    let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.source == utility });
    return this.vizualizationService.getFacilityDashboardBarChartData(filteredMeters, this.sumByMonth, this.removeIncompleteYears);
  }

  
  checkGraphDisplay(): boolean {
    if (this.graphDisplay) {
      if (this.graphDisplay != 'emissions') {
        return true;
      } else if (this.emissionsDisplay) {
        return true;
      }
    }
    return false;
  }
}
