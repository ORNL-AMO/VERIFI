import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { AccountSummaryService } from '../../account-summary.service';
import * as _ from 'lodash';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-energy-use-stacked-bar-chart',
  templateUrl: './energy-use-stacked-bar-chart.component.html',
  styleUrls: ['./energy-use-stacked-bar-chart.component.css']
})
export class EnergyUseStackedBarChartComponent implements OnInit {

  @ViewChild('energyUseStackedBarChart', { static: false }) energyUseStackedBarChart: ElementRef;

  accountFacilitiesSub: Subscription;
  accountMeterData: Array<IdbUtilityMeterData>;
  barChartData: Array<StackedBarChartData>;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService, private plotlyService: PlotlyService) { }

  ngOnInit(): void {
    this.accountFacilitiesSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.accountMeterData = val;
      this.setBarChartData();
      this.drawChart();
    });
  }
  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.energyUseStackedBarChart && this.barChartData && this.barChartData.length != 0) {

      let data = new Array();
      if (this.barChartData.findIndex(dataItem => { return dataItem.electricity.energyCost != 0 }) != -1) {
        data.push({
          x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
          y: this.barChartData.map(dataItem => { return dataItem.electricity.energyCost }),
          name: 'Electricity',
          type: 'bar'
        });
      }
      if (this.barChartData.findIndex(dataItem => { return dataItem.naturalGas.energyCost != 0 }) != -1) {
        data.push({
          x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
          y: this.barChartData.map(dataItem => { return dataItem.naturalGas.energyCost }),
          name: 'Natural Gas',
          type: 'bar'
        })
      }
      if (this.barChartData.findIndex(dataItem => { return dataItem.otherFuels.energyCost != 0 }) != -1) {
        data.push({
          x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
          y: this.barChartData.map(dataItem => { return dataItem.otherFuels.energyCost }),
          name: 'Other Fuels',
          type: 'bar'
        })
      }
      if (this.barChartData.findIndex(dataItem => { return dataItem.otherEnergy.energyCost != 0 }) != -1) {
        data.push({
          x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
          y: this.barChartData.map(dataItem => { return dataItem.otherEnergy.energyCost }),
          name: 'Other Energy',
          type: 'bar'
        })
      }
      if (this.barChartData.findIndex(dataItem => { return dataItem.water.energyCost != 0 }) != -1) {
        data.push({
          x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
          y: this.barChartData.map(dataItem => { return dataItem.water.energyCost }),
          name: 'Water',
          type: 'bar'
        })
      }
      if (this.barChartData.findIndex(dataItem => { return dataItem.wasteWater.energyCost != 0 }) != -1) {
        data.push({
          x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
          y: this.barChartData.map(dataItem => { return dataItem.wasteWater.energyCost }),
          name: 'Waste Water',
          type: 'bar'
        })
      }
      if (this.barChartData.findIndex(dataItem => { return dataItem.otherUtility.energyCost != 0 }) != -1) {
        data.push({
          x: this.barChartData.map(dataItem => { return dataItem.facilityName }),
          y: this.barChartData.map(dataItem => { return dataItem.otherUtility.energyCost }),
          name: 'Other Utility',
          type: 'bar'
        })
      }

      var layout = { barmode: 'stack' };
      let config = { responsive: true };
      this.plotlyService.newPlot(this.energyUseStackedBarChart.nativeElement, data, layout, config);
    }
  }

  setBarChartData() {
    this.barChartData = new Array();

    let facilityIds: Array<number> = this.accountMeterData.map(data => { return data.facilityId });
    facilityIds = _.uniq(facilityIds);
    let accountMeterDataCopy: Array<IdbUtilityMeterData> = JSON.parse(JSON.stringify(this.accountMeterData));

    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    facilityIds.forEach(id => {
      let electricity: UtilityItem = { energyUse: 0, energyCost: 0 };
      let naturalGas: UtilityItem = { energyUse: 0, energyCost: 0 };
      let otherFuels: UtilityItem = { energyUse: 0, energyCost: 0 };
      let otherEnergy: UtilityItem = { energyUse: 0, energyCost: 0 };
      let water: UtilityItem = { energyUse: 0, energyCost: 0 };
      let wasteWater: UtilityItem = { energyUse: 0, energyCost: 0 };
      let otherUtility: UtilityItem = { energyUse: 0, energyCost: 0 };
      let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterDataCopy.filter(meterData => { return meterData.facilityId == id });
      facilityMeterData.forEach(dataItem => {
        let meter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(dataItem.meterId);
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
      });
      let facility: IdbFacility = accountFacilites.find(facility => { return facility.id == id });

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
      console.log(this.barChartData);
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