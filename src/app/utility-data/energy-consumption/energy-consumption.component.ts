import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDataService } from './utility-meter-data/utility-meter-data.service';

@Component({
  selector: 'app-energy-consumption',
  templateUrl: './energy-consumption.component.html',
  styleUrls: ['./energy-consumption.component.css']
})
export class EnergyConsumptionComponent implements OnInit {
  electricity: boolean;
  naturalGas: boolean;
  otherFuels: boolean;
  otherEnergy: boolean;
  water: boolean;
  wasteWater: boolean;
  otherUtility: boolean;

  electricityTabClass: string;
  naturalGasTabClass: string;
  otherFuelsTabClass: string;
  otherEnergyTabClass: string;
  waterTabClass: string;
  wasteWaterTabClass: string;
  otherUtilityTabClass: string;

  utilityMeters: Array<IdbUtilityMeter>;
  utilityMeterData: Array<IdbUtilityMeterData>;

  facilityMetersSub: Subscription;
  utilityDataSub: Subscription;

  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDataService: UtilityMeterDataService
  ) { }

  ngOnInit() {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      let energySources = facilityMeters.map(function (el) { return el.source; });
      this.electricity = energySources.indexOf("Electricity") > -1;
      this.naturalGas = energySources.indexOf("Natural Gas") > -1;
      this.otherFuels = energySources.indexOf("Other Fuels") > -1;
      this.otherEnergy = energySources.indexOf("Other Energy") > -1;
      this.water = energySources.indexOf("Water") > -1;
      this.wasteWater = energySources.indexOf("Waste Water") > -1;
      this.otherUtility = energySources.indexOf("Other Utility") > -1;
      this.utilityMeters = facilityMeters;
      this.checkMeterData();

    });

    this.utilityDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(utilityMeterData => {
      this.utilityMeterData = utilityMeterData;
      this.checkMeterData();
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.utilityDataSub.unsubscribe();
  }

  checkMeterData() {
    this.electricityTabClass = undefined;
    this.naturalGasTabClass = undefined;
    this.otherFuelsTabClass = undefined;
    this.otherEnergyTabClass = undefined;
    this.otherUtilityTabClass = undefined;
    this.wasteWaterTabClass = undefined;
    this.waterTabClass = undefined;
    if (this.utilityMeterData) {
      this.utilityMeters.forEach(meter => {
        if (meter.source === "Electricity" && !this.electricityTabClass) {
          this.electricityTabClass = this.checkHasErrors(meter, this.utilityMeterData)
        }
        if (meter.source === "Natural Gas" && !this.naturalGasTabClass) {
          this.naturalGasTabClass = this.checkHasErrors(meter, this.utilityMeterData)
        }
        if (meter.source === "Other Fuels" && !this.otherFuelsTabClass) {
          this.otherFuelsTabClass = this.checkHasErrors(meter, this.utilityMeterData)
        }
        if (meter.source === "Other Energy" && !this.otherEnergyTabClass) {
          this.otherEnergyTabClass = this.checkHasErrors(meter, this.utilityMeterData)
        }
        if (meter.source === "Water" && !this.otherUtilityTabClass) {
          this.otherUtilityTabClass = this.checkHasErrors(meter, this.utilityMeterData)
        }
        if (meter.source === "Waste Water" && !this.wasteWaterTabClass) {
          this.wasteWaterTabClass = this.checkHasErrors(meter, this.utilityMeterData)
        }
        if (meter.source === "Other Utility" && !this.waterTabClass) {
          this.waterTabClass = this.checkHasErrors(meter, this.utilityMeterData)
        }
      });
    }
  }

  checkHasErrors(meter: IdbUtilityMeter, facilityMeterData: Array<IdbUtilityMeterData>): string {
    let meterData: Array<IdbUtilityMeterData> = facilityMeterData.filter(data => { return data.meterId == meter.id });
    let checkDate: { error: Date, warning: Date, missingMonth: Date } = this.utilityMeterDataService.checkForErrors(meterData, meter);
    if (checkDate.error || meterData.length == 0) {
      return 'error';
    } else if (checkDate.warning || checkDate.missingMonth) {
      return 'warning'
    }
    return;
  }

}
