import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ControlContainer, FormGroupDirective } from '@angular/forms';
import { EnergyConsumptionService } from './energy-consumption.service';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db-service";

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
  paper: boolean;
  otherGas: boolean;
  otherEnergy: boolean;
  meterList: any = [{type: ''}];
  
  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    private energyConsumptionService: EnergyConsumptionService,
    public utilityMeterdbService: UtilityMeterdbService,
    ) {

    // Get all meters
    this.utilityMeterdbService.getAllByIndex(this.facilityid).then(
      data => {
        this.meterList = data;
        // Map tabs based on array of energy source types.
        this.energySource = this.meterList.map(function (el) { return el.type; });
        this.energyConsumptionService.setValue(this.energySource);
      },
      error => {
          console.log(error);
      }
    );

  }

  ngOnInit() {
    // Observe the accountid var
    this.accountService.getValue().subscribe((value) => {
      this.accountid = value;
    });

    // Observe the facilityid var
    this.facilityService.getValue().subscribe((value) => {
      this.facilityid = value;
    });

    // Observe the energySource var
    this.energyConsumptionService.getValue().subscribe((value) => {
      this.energySource = value;
  
      if (value != null) {
        this.electricity = this.energySource.indexOf("Electricity") > -1;
        this.naturalGas = this.energySource.indexOf("Natural Gas") > -1;
        this.lpg = this.energySource.indexOf("LPG") > -1;
        this.fuelOil = this.energySource.indexOf("Fuel Oil") > -1;
        this.coal = this.energySource.indexOf("Coal") > -1;
        this.wood = this.energySource.indexOf("Wood") > -1;
        this.paper = this.energySource.indexOf("Paper") > -1;
        this.otherGas = this.energySource.indexOf("Other Gas") > -1;
        this.otherEnergy = this.energySource.indexOf("Other Energy") > -1;
      }
    });
  }


}
