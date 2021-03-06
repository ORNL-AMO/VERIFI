import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DashboardService } from '../../dashboard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-energy-use-stacked-bar-chart',
  templateUrl: './energy-use-stacked-bar-chart.component.html',
  styleUrls: ['./energy-use-stacked-bar-chart.component.css']
})
export class EnergyUseStackedBarChartComponent implements OnInit {

  @ViewChild('energyUseStackedBarChart', { static: false }) energyUseStackedBarChart: ElementRef;

  accountFacilitiesSub: Subscription;
  barChartData: Array<StackedBarChartData>;
  graphDisplay: "cost" | "usage";
  graphDisplaySub: Subscription;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService, private plotlyService: PlotlyService, private dashboardService: DashboardService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.accountFacilitiesSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.setBarChartData();
      this.drawChart();
    });
    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(val => {
      this.graphDisplay = val;
      this.setBarChartData();
      this.drawChart();
    })
  }
  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.energyUseStackedBarChart) {
      if (this.barChartData && this.barChartData.length != 0 && this.graphDisplay) {
        let yDataProperty: "energyCost" | "energyUse";
        let tickprefix: string;
        let yaxisTitle: string;
        if (this.graphDisplay == "cost") {
          yaxisTitle = "Utility Costs";
          yDataProperty = "energyCost";
          tickprefix = "$";
        } else {
          let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
          yaxisTitle = "Utility Usage (" + selectedAccount.energyUnit + ")";
          yDataProperty = "energyUse";
          tickprefix = "";
        }
        let data = new Array();
        if (this.barChartData.findIndex(dataItem => { return dataItem.electricity[yDataProperty] != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.electricity[yDataProperty] }),
            name: 'Electricity',
            type: 'bar'
          });
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.naturalGas[yDataProperty] != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.naturalGas[yDataProperty] }),
            name: 'Natural Gas',
            type: 'bar'
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.otherFuels[yDataProperty] != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.otherFuels[yDataProperty] }),
            name: 'Other Fuels',
            type: 'bar'
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.otherEnergy[yDataProperty] != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.otherEnergy[yDataProperty] }),
            name: 'Other Energy',
            type: 'bar'
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.water[yDataProperty] != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.water[yDataProperty] }),
            name: 'Water',
            type: 'bar'
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.wasteWater[yDataProperty] != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.wasteWater[yDataProperty] }),
            name: 'Waste Water',
            type: 'bar'
          })
        }
        if (this.barChartData.findIndex(dataItem => { return dataItem.otherUtility[yDataProperty] != 0 }) != -1) {
          data.push({
            x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
            y: this.barChartData.map(dataItem => { return dataItem.otherUtility[yDataProperty] }),
            name: 'Other Utility',
            type: 'bar'
          })
        }

        var layout = {
          barmode: 'stack',
          showlegend: true,
          yaxis: {
            title: yaxisTitle,
            tickprefix: tickprefix,
            automargin: true,
            // ticksuffix: ticksuffix
          },
          xaxis: {
            automargin: true
          },
          legend: {
            orientation: "h"
          }
        };
        let config = {
          displaylogo: false,
          responsive: true
        };
        this.plotlyService.newPlot(this.energyUseStackedBarChart.nativeElement, data, layout, config);
      } else {
        let Plotly = this.plotlyService.getPlotly();
        Plotly.purge(this.energyUseStackedBarChart.nativeElement);
      }
    }
  }

  setBarChartData() {
    this.barChartData = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    
    let accountMeterData: Array<IdbUtilityMeterData> = new Array();
    accountMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForAccount(meter, true);
      accountMeterData = accountMeterData.concat(meterData)
    })

    let facilityIds: Array<number> = accountMeterData.map(data => { return data.facilityId });
    facilityIds = _.uniq(facilityIds);

    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    facilityIds.forEach(id => {
      let electricity: UtilityItem = { energyUse: 0, energyCost: 0 };
      let naturalGas: UtilityItem = { energyUse: 0, energyCost: 0 };
      let otherFuels: UtilityItem = { energyUse: 0, energyCost: 0 };
      let otherEnergy: UtilityItem = { energyUse: 0, energyCost: 0 };
      let water: UtilityItem = { energyUse: 0, energyCost: 0 };
      let wasteWater: UtilityItem = { energyUse: 0, energyCost: 0 };
      let otherUtility: UtilityItem = { energyUse: 0, energyCost: 0 };
      let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == id });
      facilityMeterData.forEach(dataItem => {
        let meter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(dataItem.meterId);
        if (meter) {
          if (meter.source == 'Electricity') {
            electricity.energyUse = (electricity.energyUse + Number(dataItem.totalEnergyUse));
            electricity.energyCost = (electricity.energyCost + Number(dataItem.totalCost));
          }
          else if (meter.source == 'Natural Gas') {
            naturalGas.energyUse = (naturalGas.energyUse + Number(dataItem.totalEnergyUse));
            naturalGas.energyCost = (naturalGas.energyCost + Number(dataItem.totalCost));
          }
          else if (meter.source == 'Other Fuels') {
            otherFuels.energyUse = (otherFuels.energyUse + Number(dataItem.totalEnergyUse));
            otherFuels.energyCost = (otherFuels.energyCost + Number(dataItem.totalCost));
          }
          else if (meter.source == 'Other Energy') {
            otherEnergy.energyUse = (otherEnergy.energyUse + Number(dataItem.totalEnergyUse));
            otherEnergy.energyCost = (otherEnergy.energyCost + Number(dataItem.totalCost));
          }
          else if (meter.source == 'Water') {
            water.energyUse = (water.energyUse + Number(dataItem.totalEnergyUse));
            water.energyCost = (water.energyCost + Number(dataItem.totalCost));
          }
          else if (meter.source == 'Waste Water') {
            wasteWater.energyUse = (wasteWater.energyUse + Number(dataItem.totalEnergyUse));
            wasteWater.energyCost = (wasteWater.energyCost + Number(dataItem.totalCost));
          }
          else if (meter.source == 'Other Utility') {
            otherUtility.energyUse = (otherUtility.energyUse + Number(dataItem.totalEnergyUse));
            otherUtility.energyCost = (otherUtility.energyCost + Number(dataItem.totalCost));
          }
        }
      });
      let facility: IdbFacility = accountFacilites.find(facility => { return facility.id == id });
      if (facility) {
        this.barChartData.push({
          facilityName: facility.name,
          electricity: electricity,
          naturalGas: naturalGas,
          otherFuels: otherFuels,
          otherEnergy: otherEnergy,
          water: water,
          wasteWater: wasteWater,
          otherUtility: otherUtility
        });
      }
    });
  }

}

export interface StackedBarChartData {
  facilityName: string
  electricity: UtilityItem,
  naturalGas: UtilityItem,
  otherFuels: UtilityItem,
  otherEnergy: UtilityItem,
  water: UtilityItem,
  wasteWater: UtilityItem,
  otherUtility: UtilityItem
}

export interface UtilityItem {
  energyUse: number,
  energyCost: number
}