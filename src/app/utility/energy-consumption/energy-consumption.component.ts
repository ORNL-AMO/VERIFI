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

  hasElectricityError: boolean;
  hasNaturalGasError: boolean;
  hasOtherFuelsError: boolean;
  hasOtherEnergyError: boolean;
  hasWaterError: boolean;
  hasWasteWaterError: boolean;
  hasOtherUtilityError: boolean;

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

    });

    this.utilityDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(utilityMeterData => {
      this.checkMeterData(utilityMeterData);
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.utilityDataSub.unsubscribe();
  }

  checkMeterData(utilityMeterData: Array<IdbUtilityMeterData>) {
    this.hasElectricityError = false;
    this.hasNaturalGasError = false;
    this.hasOtherFuelsError = false;
    this.hasOtherEnergyError = false;
    this.hasOtherUtilityError = false;
    this.hasWasteWaterError = false;
    this.hasWaterError = false;

    this.utilityMeters.forEach(meter => {
      if (meter.source === "Electricity" && !this.hasElectricityError) {
        this.hasElectricityError = this.checkHasErrors(meter, utilityMeterData)
      } 
      if (meter.source === "Natural Gas" && !this.hasNaturalGasError) {
        this.hasNaturalGasError = this.checkHasErrors(meter, utilityMeterData)
      }
      if (meter.source === "Other Fuels" && !this.hasOtherFuelsError) {
        this.hasOtherFuelsError = this.checkHasErrors(meter, utilityMeterData)
      }
      if (meter.source === "Other Energy" && !this.hasOtherEnergyError) {
        this.hasOtherEnergyError = this.checkHasErrors(meter, utilityMeterData)
      }
      if (meter.source === "Water" && !this.hasWaterError) {
        this.hasWaterError = this.checkHasErrors(meter, utilityMeterData)
      }
      if (meter.source === "Waste Water" && !this.hasWasteWaterError) {
        this.hasWasteWaterError = this.checkHasErrors(meter, utilityMeterData)
      }
      if (meter.source === "Other Utility" && !this.hasOtherUtilityError) {
        this.hasOtherUtilityError = this.checkHasErrors(meter, utilityMeterData)
      }
    });
  }

  checkHasErrors(meter: IdbUtilityMeter, facilityMeterData: Array<IdbUtilityMeterData>) {
    let meterData: Array<IdbUtilityMeterData> = facilityMeterData.filter(data => { return data.meterId == meter.id });
    let dataHasErrors: Date = this.utilityMeterDataService.checkForErrors(meterData);
    if(dataHasErrors){
      return true;
    }
    return meterData.length == 0;
  }

}
