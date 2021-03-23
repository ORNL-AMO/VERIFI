import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';

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

  hasElectricityData: boolean;
  hasNaturalGasData: boolean;
  hasOtherFuelsData: boolean;
  hasOtherEnergyData: boolean;
  hasWaterData: boolean;
  hasWasteWaterData: boolean;
  hasOtherUtilityData: boolean;
  
  utilityMeters: Array<IdbUtilityMeter>;
  utilityMeterData: Array<IdbUtilityMeterData>;

  facilityMetersSub: Subscription;
  utilityDataSub: Subscription;

  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService
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
      
    });

    this.utilityDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(utilityMeterData => {
      this.checkMeterData(utilityMeterData);
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.utilityDataSub.unsubscribe();
  }

  checkMeterData(utilityMeterData) {
    this.utilityMeters.forEach(meter => {
      const meterData = utilityMeterData.filter(meterData => { return meterData.meterId == meter.id });
      if(meter.source === "Electricity") {
        this.hasElectricityData = (meterData.length != 0 ? true : false);
      }
      if(meter.source === "Natural Gas") {
        this.hasNaturalGasData = (meterData.length != 0 ? true : false);
      }
      if(meter.source === "Other Fuels") {
        this.hasOtherFuelsData = (meterData.length != 0 ? true : false);
      }
      if(meter.source === "Other Energy") {
        this.hasOtherEnergyData = (meterData.length != 0 ? true : false);
      }
      if(meter.source === "Water") {
        this.hasWaterData = (meterData.length != 0 ? true : false);
      }
      if(meter.source === "Waste Water") {
        this.hasWasteWaterData = (meterData.length != 0 ? true : false);
      }
      if(meter.source === "Other Utility") {
        this.hasOtherUtilityData = (meterData.length != 0 ? true : false);
      }
    });
  }

}
