import { Component, OnInit } from '@angular/core';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db-service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db-service";
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent implements OnInit {
  accountid: number;
  facilityid: number;
  meterid: number = 1;
  meterList: any = [];
  meterDataList: any;
  meterDataMenuOpen: number;

  filterColMenu: boolean = false;
  filterCol = [
    {id: 0, filter: true, name: 'filterColBasicCharge', display: 'Basic Charge'},
    {id: 1, filter: false, name: 'filterColSupplyBlockAmt', display: 'Supply Block Amt'},
    {id: 2, filter: false, name: 'filterColSupplyBlockCharge', display: 'Supply Block Charge'},
    {id: 3, filter: false, name: 'filterColFlatRateAmt', display: 'Flat Rate Amt'},
    {id: 4, filter: false, name: 'filterColFlatRateCharge', display: 'Flat Rate Charge'},
    {id: 5, filter: false, name: 'filterColPeakAmt', display: 'Peak Amt'},
    {id: 6, filter: false, name: 'filterColPeakCharge', display: 'Peak Charge'},
    {id: 7, filter: false, name: 'filterColOffpeakAmt', display: 'Off-Peak Amt'},
    {id: 8, filter: false, name: 'filterColOffpeakCharge', display: 'Off-Peak Charge'},
    {id: 9, filter: false, name: 'filterColDemandBlockAmt', display: 'Demand Block Amt'},
    {id: 10, filter: false, name: 'filterColDemandBlockCharge', display: 'Demand Block Charge'},
    {id: 11, filter: false, name: 'filterColGenTransCharge', display: 'Generation and Transmission Charge'},
    {id: 12, filter: true, name: 'filterColDeliveryCharge', display: 'Delivery Charge'},
    {id: 13, filter: false, name: 'filterColTransCharge', display: 'Transmission Charge'},
    {id: 14, filter: false, name: 'filterColPowerFactorCharge', display: 'Power Factor Charge'},
    {id: 15, filter: false, name: 'filterColBusinessCharge', display: 'Local Business Charge'},
    {id: 16, filter: true, name: 'filterColUtilityTax', display: 'Utility Tax'},
    {id: 17, filter: true, name: 'filterColLatePayment', display: 'Late Payment'},
    {id: 18, filter: true, name: 'filterColOtherCharge', display: 'Other Charge'}
  ];

  filterInpMenu: boolean = false;
  filterInp = [
    {id: 0, filter: true, name: 'filterInpBasicCharge', display: 'Basic Charge'},
    {id: 1, filter: false, name: 'filterInpSupplyBlockAmt', display: 'Supply Block Amt'},
    {id: 2, filter: false, name: 'filterInpSupplyBlockCharge', display: 'Supply Block Charge'},
    {id: 3, filter: false, name: 'filterInpFlatRateAmt', display: 'Flat Rate Amt'},
    {id: 4, filter: false, name: 'filterInpFlatRateCharge', display: 'Flat Rate Charge'},
    {id: 5, filter: false, name: 'filterInpPeakAmt', display: 'Peak Amt'},
    {id: 6, filter: false, name: 'filterInpPeakCharge', display: 'Peak Charge'},
    {id: 7, filter: false, name: 'filterInpOffpeakAmt', display: 'Off-Peak Amt'},
    {id: 8, filter: false, name: 'filterInpOffpeakCharge', display: 'Off-Peak Charge'},
    {id: 9, filter: false, name: 'filterInpDemandBlockAmt', display: 'Demand Block Amt'},
    {id: 10, filter: false, name: 'filterInpDemandBlockCharge', display: 'Demand Block Charge'},
    {id: 11, filter: false, name: 'filterInpGenTransCharge', display: 'Generation and Transmission Charge'},
    {id: 12, filter: true, name: 'filterInpDeliveryCharge', display: 'Delivery Charge'},
    {id: 13, filter: false, name: 'filterInpTransCharge', display: 'Transmission Charge'},
    {id: 14, filter: false, name: 'filterInpPowerFactorCharge', display: 'Power Factor Charge'},
    {id: 15, filter: false, name: 'filterInpBusinessCharge', display: 'Local Business Charge'},
    {id: 16, filter: true, name: 'filterInpUtilityTax', display: 'Utility Tax'},
    {id: 17, filter: true, name: 'filterInpLatePayment', display: 'Late Payment'},
    {id: 18, filter: true, name: 'filterInpOtherCharge', display: 'Other Charge'}
  ];

  popup: boolean = false;

  meterDataForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    //dataid: new FormControl('', [Validators.required]),
    meterid: new FormControl('', [Validators.required]),
    facilityid: new FormControl('', [Validators.required]),
    accountid: new FormControl('', [Validators.required]),
    readDate: new FormControl('', [Validators.required]),
    totalKwh: new FormControl('', [Validators.required]),
    totalDemand: new FormControl('', [Validators.required]),
    totalCost: new FormControl('', [Validators.required]),
    basicCharge: new FormControl('', [Validators.required]),
    supplyBlockAmt: new FormControl('', [Validators.required]),
    supplyBlockCharge: new FormControl('', [Validators.required]),
    flatRateAmt: new FormControl('', [Validators.required]),
    flatRateCharge: new FormControl('', [Validators.required]),
    peakAmt: new FormControl('', [Validators.required]),
    peakCharge: new FormControl('', [Validators.required]),
    offpeakAmt: new FormControl('', [Validators.required]),
    offpeakCharge: new FormControl('', [Validators.required]),
    demandBlockAmt: new FormControl('', [Validators.required]),
    demandBlockCharge: new FormControl('', [Validators.required]),
    genTransCharge: new FormControl('', [Validators.required]),
    deliveryCharge: new FormControl('', [Validators.required]),
    transCharge: new FormControl('', [Validators.required]),
    powerFactorCharge: new FormControl('', [Validators.required]),
    businessCharge: new FormControl('', [Validators.required]),
    utilityTax: new FormControl('', [Validators.required]),
    latePayment: new FormControl('', [Validators.required]),
    otherCharge: new FormControl('', [Validators.required]),
  });

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService
    ) { }

  ngOnInit() {
    // Observe the accountid var
    this.accountService.getValue().subscribe((value) => {
      this.accountid = value;
    });

    // Observe the facilityid var
    this.facilityService.getValue().subscribe((value) => {
      this.facilityid = value;
      this.meterLoadList();
      //this.meterDataLoadList();
    });
  }

  meterLoadList() {
    // List all meters
    this.utilityMeterdbService.getAllByIndex(this.facilityid).then(
      data => {
          this.meterList = data;
          this.meterList = this.meterList.filter(function(obj) {
            return obj.type == "Electricity"
          });
          // Add all meter data to meter list
          this.meterDataLoadList()
      },
      error => {
          console.log(error);
      }
    );
  }

  meterDataLoadList() {
  // loop each meter
    for (let i=0; i < this.meterList.length; i++) {
      // filter meter data based on meterid
      this.utilityMeterDatadbService.getAllByIndex(this.meterList[i]['id']).then(
        data => {
          // push to meterlist object
          this.meterList[i]['data'] = data;
          this.calendarization(data);
        },
        error => {
            console.log(error);
        }
      );
    }
  }

  // Close menus when user clicks outside the dropdown
  documentClick () {
    this.meterDataMenuOpen = null;
  }

  meterDataToggleMenu (index) {
    if (this.meterDataMenuOpen === index) {
      this.meterDataMenuOpen = null;
    } else {
      this.meterDataMenuOpen = index;
    }
  }

  meterDataAdd(id) {
    console.log("meter id " +id);
    this.utilityMeterDatadbService.add(id,this.facilityid,this.accountid).then(
      dataid => {
        // filter meter data based on meterid
        this.utilityMeterDatadbService.getAllByIndex(id).then(
          result => {
            // push to meterlist object
            const index = this.meterList.findIndex(obj => obj.id == id);
            this.meterList[index]['data'] = result;
            this.meterDataEdit(id,dataid); // edit data
          },
          error => {
              console.log(error);
          }
        );
      },
      error => {
          console.log(error);
      }
    );
  }

  meterDataSave() {
    this.popup = !this.popup;
    console.log(this.meterDataForm.value);
    this.utilityMeterDatadbService.update(this.meterDataForm.value);// Update db
    this.meterDataLoadList(); // refresh the data
  }

  meterDataEdit(meterid,dataid) {
    this.popup = !this.popup;
    this.meterDataMenuOpen = null;
    const meter = this.meterList.find(obj => obj.id == meterid);
    const meterdata = meter.data.find(obj => obj.id == dataid);
    this.meterDataForm.setValue(meterdata); // Set form values to current selected meter
  }

  meterDataDelete(dataid) {
    this.meterDataMenuOpen = null;
    this.utilityMeterDatadbService.deleteIndex(dataid);
    this.meterDataLoadList(); // refresh the data
  }

  showAllFields() {
    for(let i=0; i < this.filterInp.length; i++) {
      this.filterInp[i]["filter"] = true;
    }
  }

  showAllColumns() {
    for(let i=0; i < this.filterCol.length; i++) {
      this.filterCol[i]["filter"] = true;
    }
  }

  calendarization (data) {
    
    for(let i=0; i < data.length; i++) {
      console.log(data[i]);
    }
    // First of month (1)
    const firstDay = new Date("2020-01-01");
    const firstDayNext = new Date("2020-02-01");

    // End of billing cycle (meter read date)
    const a = new Date("2020-01-15");

    // Billed volume (var)
    const vol = 20720;
    const volNext = 19220;

    // * Days in billing cycle (next meter date - prev meter date)
    const b = new Date("2020-02-15");
    const c = new Date("2020-03-15");

    const difference = this.dateDiffInDays(a, b) + 1;
    console.log("diff: "+difference);

    // Volume per day (billed volume / days in cycle)
    const volPerDay = vol / difference;
    const volPerDayNext = 620;
    console.log("vol/day: "+volPerDay);

    // Days before (first of month - meter read date)
    let daysBefore = this.dateDiffInDays(firstDay, a) + 1;
    console.log("days before: "+daysBefore);
    
    // Days after (meter read date - next first of month)
    const daysAfter = this.dateDiffInDays(a, firstDayNext) - 1;
    console.log("days after: "+daysAfter);

    // * Monthly Volume (
      // if days after = 0
        // vol day * days before
      // if vol day = 0
        // next billed volume - next vol day * next days before
      // else vol day * days before * next vol day * days after
    //)
    let monthlyVol = 0;
    if (daysAfter == 0) {
      monthlyVol = volPerDay * daysBefore;
    } else if (volPerDay == 0) {
      monthlyVol = vol - volPerDay * daysBefore;
    } else {
      monthlyVol = volPerDay * daysBefore + volPerDayNext * daysAfter;
    }
    console.log("--------------");
    console.log("before: " + volPerDay * daysBefore);
    console.log("affter: " + volPerDayNext * daysAfter);
    const dataTable = {
      month: '',
      monthKwh: '',
      monthDemand: '',
      monthCost: ''
    }
    // Where to store result??
    console.log("monthly vol: "+monthlyVol);
  }
  

  // a and b are javascript Date objects
  dateDiffInDays(a, b) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
  }
  
  
}
