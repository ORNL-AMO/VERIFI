import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db-service';

@Component({
  selector: 'app-energy-consumption',
  templateUrl: './energy-consumption.component.html',
  styleUrls: ['./energy-consumption.component.css']
})
export class EnergyConsumptionComponent implements OnInit {
  electricity: boolean;
  naturalGas: boolean;
  lpg: boolean;
  fuelOil: boolean;
  coal: boolean;
  wood: boolean;
  otherGas: boolean;
  otherEnergy: boolean;

  facilityMetersSub: Subscription;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService
  ) { }

  ngOnInit() {
    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      let energySources = facilityMeters.map(function (el) { return el.source; });
      this.electricity = energySources.indexOf("Electricity") > -1;
      this.naturalGas = energySources.indexOf("Natural Gas") > -1;
      this.lpg = energySources.indexOf("LPG") > -1;
      this.fuelOil = energySources.indexOf("Fuel Oil") > -1;
      this.coal = energySources.indexOf("Coal") > -1;
      this.wood = energySources.indexOf("Wood") > -1;
      this.otherGas = energySources.indexOf("Other Gas") > -1;
      this.otherEnergy = energySources.indexOf("Other Energy") > -1;
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
  }

}
