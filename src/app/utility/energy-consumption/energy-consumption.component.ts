import { Component, OnInit } from '@angular/core';
import { EnergyConsumptionService } from './energy-consumption.service';
import { UtilityService } from "../../utility/utility.service";

@Component({
  selector: 'app-energy-consumption',
  templateUrl: './energy-consumption.component.html',
  styleUrls: ['./energy-consumption.component.css']
})
export class EnergyConsumptionComponent implements OnInit {
  accountid: number;
  facilityid: number;
  energySource: any;
  electricity: boolean;
  naturalGas: boolean;
  lpg: boolean;
  fuelOil: boolean;
  coal: boolean;
  wood: boolean;
  otherGas: boolean;
  otherEnergy: boolean;
  meterList: any = [{source: ''}];
  
  constructor(
    private energyConsumptionService: EnergyConsumptionService,
    private utilityService: UtilityService
    ) {}

  ngOnInit() {

    // Observe the meter list
    this.utilityService.getMeterList().subscribe((value) => {
      this.meterList = value;

      // Map tabs based on array of energy source types.
      this.energySource = this.meterList.map(function (el) { return el.source; });
      this.energyConsumptionService.setEnergySource(this.energySource);
      
    });
    
    // Observe the energySource var
    this.energyConsumptionService.getEnergySource().subscribe((value) => {
      this.energySource = value;

      if (value != null) {
        this.electricity = this.energySource.indexOf("Electricity") > -1;
        this.naturalGas = this.energySource.indexOf("Natural Gas") > -1;
        this.lpg = this.energySource.indexOf("LPG") > -1;
        this.fuelOil = this.energySource.indexOf("Fuel Oil") > -1;
        this.coal = this.energySource.indexOf("Coal") > -1;
        this.wood = this.energySource.indexOf("Wood") > -1;
        this.otherGas = this.energySource.indexOf("Other Gas") > -1;
        this.otherEnergy = this.energySource.indexOf("Other Energy") > -1;
      }
    });
  }

}
