import { Component, OnInit } from '@angular/core';
import { AccountService } from "../../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../../../indexedDB/utilityMeter-db-service";

@Component({
  selector: 'app-electricity',
  templateUrl: './electricity.component.html',
  styleUrls: ['./electricity.component.css']
})
export class ElectricityComponent implements OnInit {
  accountid: number;
  facilityid: number;
  meterList: any = [{type: ''}];

  bills: any;
  meters: any = [1,2];
  filterMenu: boolean = false;
  filterkWh: boolean = true;
  filterPeak: boolean = true;
  filterOffpeak: boolean = true;
  filterDemand: boolean = true;
  filterCost: boolean = true;
  filterAvg: boolean = true;
  popup: boolean = false;
  popup2: boolean = false;

  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    public utilityMeterdbService: UtilityMeterdbService) { }

  ngOnInit() {
    // Observe the accountid var
    this.accountService.getValue().subscribe((value) => {
      this.accountid = value;
    });

    // Observe the facilityid var
    this.facilityService.getValue().subscribe((value) => {
      this.facilityid = value;
      this.meterLoadList();
    }); 

    this.bills  = [
      {
        id: 1,
        readDate: 'January 15 2020',
        kWh: '0.00',
        peak: '0.00',
        offPeak: '0.00',
        demand: '0.00',
        cost: '0.00',
        average: '<i class="fa fa-arrow-circle-up"></i>'
      },
      {
        id: 2,
        readDate: 'February 11 2020',
        kWh: '0.00',
        peak: '0.00',
        offPeak: '0.00',
        demand: '0.00',
        cost: '0.00',
        average: '<i class="fa fa-arrow-circle-down"></i>'
      },
      {
        id: 3,
        readDate: 'March 15 2020',
        kWh: '0.00',
        peak: '0.00',
        offPeak: '0.00',
        demand: '0.00',
        cost: '0.00',
        average: '<i class="fa fa-arrow-circle-down"></i>'
      },
      {
        id: 4,
        readDate: 'April 16 2020',
        kWh: '0.00',
        peak: '0.00',
        offPeak: '0.00',
        demand: '0.00',
        cost: '0.00',
        average: '<i class="fa fa-arrow-circle-down"></i>'
      },
      {
        id: 5,
        readDate: 'January 13 2019',
        kWh: '0.00',
        peak: '0.00',
        offPeak: '0.00',
        demand: '0.00',
        cost: '0.00',
        average: '<i class="fa fa-arrow-circle-down"></i>'
      }
    ];
  }

  meterLoadList() {
    // List all meters
    this.utilityMeterdbService.getAllByIndex(this.facilityid).then(
      data => {
          this.meterList = data;
        this.meterList = this.meterList.filter(function(obj) {
            return obj.type == "Electricity"
          });
      },
      error => {
          console.log(error);
      }
    );
  }

  meterDataLoadList(meterid) {
    // List all meters
    this.utilityMeterdbService.getAllByIndex(this.facilityid).then(
      data => {
          this.meterList = data;
        this.meterList = this.meterList.filter(function(obj) {
            return obj.type == "Electricity"
          });
      },
      error => {
          console.log(error);
      }
    );
  }

  addNewBill() {
    this.popup = !this.popup;
    this.bills.push({
      id: this.bills.length + 1,
      readDate: '',
      kWh: '0.00',
      peak: '0.00',
      offPeak: '0.00',
      demand: '0.00',
      cost: '0.00',
      average: '<i class="fa fa-arrow-circle-down"></i>'
    });
  }
}
