import { Component, OnInit } from '@angular/core';
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityService } from "../utility.service";

@Component({
  selector: 'app-mo-meter-data',
  templateUrl: './mo-meter-data.component.html',
  styleUrls: ['./mo-meter-data.component.css']
})
export class MoMeterDataComponent implements OnInit {
  meterObj: any = [];
  meterDataList: any;

  page = [];
  itemsPerPage = 12;
  pageSize = [];

  constructor(
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityService: UtilityService
    ) { }

  ngOnInit() {
    // Trigger calculated calendar data
    //this.utilityService.setCalendarData();

    // Observe the meter object
    this.utilityService.getDisplayObj().subscribe((value) => {
      this.meterObj = value;
      this.setMeterPages();
      console.log("Mo Meter");
      console.log(value);
    });
    
  }

  setMeterPages() {
    for(let i=0; i < this.meterObj.length; i++) {
      this.page.push(1);
      this.pageSize.push(1);
    }
  }

  public onPageChange(index, pageNum: number): void {
    this.pageSize[index] = this.itemsPerPage*(pageNum - 1);
  }
  
  public changePagesize(num: number): void {
    this.itemsPerPage = num;

    for(let i=0; i < this.meterObj.length; i++) {
      this.onPageChange(i, this.page[i]);
    }
   
  }
}
