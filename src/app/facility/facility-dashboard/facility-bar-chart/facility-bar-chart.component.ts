
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
  selector: 'app-facility-bar-chart',
  templateUrl: './facility-bar-chart.component.html',
  styleUrls: ['./facility-bar-chart.component.css']
})
export class FacilityBarChartComponent implements OnInit {
  /*Grouped bar chart
    Group by utility
    Bars are energy usage and cost by time
    Month or year (user selection)
  */


  @ViewChild('utilityBarChart', { static: false }) utilityBarChart: ElementRef;

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

  graphDisplay: "cost" | "usage" | "emissions";
  graphDisplaySub: Subscription;

  constructor(private plotlyService: PlotlyService, private vizualizationService: VisualizationService,
    private facilityDbService: FacilitydbService, private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.calanderizedMetersSub = this.dashboardService.calanderizedFacilityMeters.subscribe(cMeters => {
      this.calanderizedMeters = cMeters;
      this.setUtilityData();
    })

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(value => {
      this.graphDisplay = value;
      this.setUtilityData();
    });
  }

  ngOnDestroy() {
    this.calanderizedMetersSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
  }

  ngAfterViewInit() {
    this.setUtilityData();
  }

  setUtilityData() {
    if (this.calanderizedMeters && this.calanderizedMeters.length != 0 && this.graphDisplay && this.utilityBarChart) {
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
    if (this.utilityBarChart) {
      let traceData = new Array();

      let yDataProperty: "energyCost" | "energyUse" | "emissions";
      let yaxisTitle: string;

      let hoverformat: string;
      let tickprefix: string;
      if (this.graphDisplay == "cost") {
        hoverformat = "$,.2f";
        yaxisTitle = 'Utility Cost';
        yDataProperty = "energyCost";
        tickprefix = "$";
      } else if (this.graphDisplay == "usage") {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        yaxisTitle = "Utility Usage (" + selectedFacility.energyUnit + ")";
        yDataProperty = "energyUse";
        tickprefix = "";
        hoverformat = ",.2f";
      } else if (this.graphDisplay == "emissions") {
        // let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        yaxisTitle = "Emissions (kg CO<sub>2</sub>)";
        yDataProperty = "emissions";
        tickprefix = "";
        hoverformat = ",.2f";
      }


      if (this.electricityData.length != 0) {
        let trace = {
          x: this.electricityData.map(data => { return data.time }),
          y: this.electricityData.map(data => { return data[yDataProperty] }),
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
          y: this.naturalGasData.map(data => { return data[yDataProperty] }),
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
          y: this.otherFuelsData.map(data => { return data[yDataProperty] }),
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
          y: this.waterData.map(data => { return data[yDataProperty] }),
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
          y: this.wasteWaterData.map(data => { return data[yDataProperty] }),
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
          y: this.otherUtilityData.map(data => { return data[yDataProperty] }),
          name: 'Other Utility',
          type: 'bar',
          marker: {
            color: UtilityColors['Other Utility'].color
          }
        };
        traceData.push(trace);
      }
      let xAxisTitle: string = 'Year';
      if (this.sumByMonth) {
        xAxisTitle = 'Month';
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
          // title: {
          //   text: xAxisTitle,
          //   font: {
          //     size: 18
          //   },
          // },
        },
        yaxis: {
          title: {
            text: yaxisTitle,
            tickprefix: tickprefix
            // font: {
            //   size: 18
            // },
          },
          hoverformat: hoverformat
        },
        margin: { r: 0, t: 50 }
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };

      this.plotlyService.newPlot(this.utilityBarChart.nativeElement, traceData, layout, config);
    }
  }

  getDataByUtility(utility: MeterSource, calanderizedMeters: Array<CalanderizedMeter>): Array<FacilityBarChartData> {
    let filteredMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.source == utility });
    return this.vizualizationService.getFacilityDashboardBarChartData(filteredMeters, this.sumByMonth, this.removeIncompleteYears);
  }
}
