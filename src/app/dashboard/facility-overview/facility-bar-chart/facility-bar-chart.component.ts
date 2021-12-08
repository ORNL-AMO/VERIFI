
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { VisualizationService } from '../../../shared/helper-services/visualization.service';
import { DashboardService } from '../../dashboard.service';

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



  electricityData: Array<{ time: string, energyUse: number, energyCost: number, emissions: number }>;
  naturalGasData: Array<{ time: string, energyUse: number, energyCost: number, emissions: number }>;
  otherFuelsData: Array<{ time: string, energyUse: number, energyCost: number, emissions: number }>;
  waterData: Array<{ time: string, energyUse: number, energyCost: number, emissions: number }>;
  wasteWaterData: Array<{ time: string, energyUse: number, energyCost: number, emissions: number }>;
  otherUtilityData: Array<{ time: string, energyUse: number, energyCost: number, emissions: number }>;
  facilityMeters: Array<IdbUtilityMeter>;
  sumByMonth: boolean = false;
  removeIncompleteYears: boolean = true;

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  accountMeterDataSub: Subscription;
  accountMeters: Array<IdbUtilityMeter>;
  accountMetersSub: Subscription;

  graphDisplay: "cost" | "usage" | "emissions";
  graphDisplaySub: Subscription;

  constructor(private plotlyService: PlotlyService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService, private vizualizationService: VisualizationService,
    private facilityDbService: FacilitydbService, private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.accountMetersSub = this.utilityMeterDbService.accountMeters.subscribe(accountMeters => {
      this.accountMeters = accountMeters;
      this.setUtilityData();
    });
    this.selectedFacilitySub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.facilityMeters = JSON.parse(JSON.stringify(facilityMeters));
      this.setUtilityData();
    });

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(accountMeterData => {
      if (accountMeterData && accountMeterData.length != 0) {
        this.setUtilityData();
      }
    });

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(value => {
      this.graphDisplay = value;
      this.setUtilityData();
    });


  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.accountMetersSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
  }

  ngAfterViewInit() {
    this.setUtilityData();
  }

  setUtilityData() {
    if (this.facilityMeters && this.facilityMeters.length != 0 && this.accountMeters && this.accountMeters.length != 0 && this.graphDisplay) {
      this.electricityData = this.getDataByUtility('Electricity', this.facilityMeters);
      this.naturalGasData = this.getDataByUtility('Natural Gas', this.facilityMeters);
      this.otherFuelsData = this.getDataByUtility('Other Fuels', this.facilityMeters);
      this.waterData = this.getDataByUtility('Water', this.facilityMeters);
      this.wasteWaterData = this.getDataByUtility('Waste Water', this.facilityMeters);
      this.otherUtilityData = this.getDataByUtility('Other Utility', this.facilityMeters);
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
      } else if(this.graphDisplay == "usage") {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        yaxisTitle = "Utility Usage (" + selectedFacility.energyUnit + ")";
        yDataProperty = "energyUse";
        tickprefix = "";
        hoverformat = ",.2f";
      }else if(this.graphDisplay == "emissions"){
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

  getDataByUtility(utility: string, facilityMeters: Array<IdbUtilityMeter>): Array<{ time: string, energyUse: number, energyCost: number, emissions: number }> {
    let filteredMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == utility });
    return this.vizualizationService.getFacilityBarChartData(filteredMeters, this.sumByMonth, this.removeIncompleteYears, false);
  }
}
