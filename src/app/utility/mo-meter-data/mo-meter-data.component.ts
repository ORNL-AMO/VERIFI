import { Component, OnInit } from '@angular/core';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db-service";
import { ElectricitydbService } from "../../indexedDB/electricity-db-service";
import { NaturalGasdbService } from "../../indexedDB/naturalGas-db-service";
import { UtilityService } from "../utility.service";

@Component({
  selector: 'app-mo-meter-data',
  templateUrl: './mo-meter-data.component.html',
  styleUrls: ['./mo-meter-data.component.css']
})
export class MoMeterDataComponent implements OnInit {
  accountid: number;
  facilityid: number;
  meterList: any = [];
  meterDataList: any;

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    public utilityMeterdbService: UtilityMeterdbService,
    public electricitydbService: ElectricitydbService,
    public naturalGasdbService: NaturalGasdbService,
    public utilityService: UtilityService
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
    this.utilityService.getMeters().subscribe((value) => {
      this.meterList = value;
    });
  }

}
