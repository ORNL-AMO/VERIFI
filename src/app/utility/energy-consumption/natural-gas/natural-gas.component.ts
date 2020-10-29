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

  page = [];
  itemsPerPage = 6;
  pageSize = [];

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
      this.meterList = this.meterList.filter(function(obj) {
        return obj.source == "Natural Gas"
      });
      this.setMeterPages();
    });
  }

  resetImport() {
    this.myInputVariable.nativeElement.value = '';
  }

  setMeterPages() {
    for(let i=0; i < this.meterList.length; i++) {
      this.page.push(1);
      this.pageSize.push(1);
    }
  }

  public onPageChange(index, pageNum: number): void {
    this.pageSize[index] = this.itemsPerPage*(pageNum - 1);
  }
  
  public changePagesize(num: number): void {
    this.itemsPerPage = num;

    for(let i=0; i < this.meterList.length; i++) {
      this.onPageChange(i, this.page[i]);
    }
   
  }

}

