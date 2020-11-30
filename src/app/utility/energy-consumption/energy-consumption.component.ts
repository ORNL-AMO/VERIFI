import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';

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

  facilityMetersSub: Subscription;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService
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
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
  }

}
