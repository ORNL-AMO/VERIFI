import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { AccountService } from "../../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityService } from "../../../utility/utility.service";
import { EnergyConsumptionService } from "../energy-consumption.service";

@Component({
  selector: 'app-natural-gas',
  templateUrl: './natural-gas.component.html',
  styleUrls: ['./natural-gas.component.css']
})
export class NaturalGasComponent implements OnInit {
  @ViewChild('inputFile') myInputVariable: ElementRef;
  
  accountid: number;
  facilityid: number;
  meterList: any = [];

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    private utilityService: UtilityService,
    public energyConsumptionService: EnergyConsumptionService, // used in html
    ) { }

  ngOnInit() {
    // Observe the accountid var
    this.accountService.getValue().subscribe((value) => {
      this.accountid = value;
    });

    // Observe the facilityid var
    this.facilityService.getValue().subscribe((value) => {
      this.facilityid = value;
    });

    // Observe the meter list
    this.utilityService.getMeterData().subscribe((value) => {
      this.meterList = value;
      console.log(value);
      this.meterList = this.meterList.filter(function(obj) {
        return obj.type == "Natural Gas"
      });
    });
  }

  resetImport() {
    this.myInputVariable.nativeElement.value = '';
  }

}

