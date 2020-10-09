import { Component, OnInit } from '@angular/core';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db-service";
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

  page = 1;
  itemsPerPage = 6;
  pageSize: number;

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    public utilityMeterdbService: UtilityMeterdbService,
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

  public onPageChange(pageNum: number): void {
    this.pageSize = this.itemsPerPage*(pageNum - 1);
  }
  
  public changePagesize(num: number): void {
    this.itemsPerPage = num;
    this.onPageChange(this.page);
  }
}
