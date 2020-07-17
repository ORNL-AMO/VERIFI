import { Component, OnInit } from '@angular/core';
import { AccountService } from "../../account/account/account.service";
import { FacilityService } from 'src/app/account/facility/facility.service';
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db-service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db-service";
import { NaturalGasdbService } from "../../indexedDB/naturalGas-db-service";

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent implements OnInit {
  accountid: number;
  facilityid: number;
  meterList: any = [];
  meterDataList: any;
  dataTable: any = [];
  unit: string;


  constructor(
    private accountService: AccountService,
    private facilityService: FacilityService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService,
    public naturalGasdbService: NaturalGasdbService
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
          /*this.meterList = this.meterList.filter(function(obj) {
            return obj.type == "Electricity"
          });*/
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
      //console.log(this.meterList);
      if (this.meterList[i].type == 'Electricity') {
        // filter meter data based on meterid
        this.utilityMeterDatadbService.getAllByIndex(this.meterList[i]['id']).then(
          data => {
            // push to meterlist object
            this.meterList[i]['data'] = data.sort(this.sortByDate);;
            //this.meterList[i]['data'].sort(this.sortByDate);
            this.meterList[i]['calendarization'] = this.calendarization(data, 'Elec');
            console.log(this.meterList);
          },
          error => {
              console.log(error);
          }
        );
        this.unit = 'kWh';
      }
      if (this.meterList[i].type == 'Natural Gas') {
        this.naturalGasdbService.getAllByIndex(this.meterList[i]['id']).then(
          data => {
            // push to meterlist object
            this.meterList[i]['data'] = data.sort(this.sortByDate);;
            //this.meterList[i]['data'].sort(this.sortByDate);
            this.meterList[i]['calendarization'] = this.calendarization(data, 'NatGas');
          },
          error => {
              console.log(error);
          }
        );
        this.unit = '(cfm)/MMBTU';
      }
    }
  }

  sortByDate(a, b) {
    return new Date(a.readDate).getTime() - new Date(b.readDate).getTime();
  }

  calendarization (data, type) {
    this.dataTable = [];

    for(let i=1; i < data.length -1; i++) {
      
      let billDate = new Date(data[i]['readDate']);
      let billDateNext = new Date(data[i]['readDate']);;
      let billDatePrev = new Date(data[i]['readDate']);;

      const monthName = billDate.toLocaleString('default', { month: 'long' });
      const year = billDate.getFullYear();

      // End of billing cycle (meter read date)
      // prevent errors on 1st and last entry
      if (i == 0)  {
        billDateNext = new Date(data[i+1]['readDate']);
        billDatePrev.setMonth(billDatePrev.getMonth()-1);
      } else if ( i == data.length - 1) {
        billDateNext.setMonth(billDateNext.getMonth() + 1);
        billDatePrev = new Date(data[i-1]['readDate']);
      } else {
        billDateNext = new Date(data[i+1]['readDate']);
        billDatePrev = new Date(data[i-1]['readDate']);
      }

      // First of month (1)
      let firstDay = new Date(billDate); firstDay.setDate(1);
      let firstDayNext = new Date(billDateNext); firstDayNext.setDate(1);

      // Days in billing cycle (next meter date - prev meter date)
      const difference = this.dateDiffInDays(billDatePrev, billDate);
      const differenceNext = this.dateDiffInDays(billDate, billDateNext);

      // Prevents skipped months from displaying
      if (difference > 28 && difference < 40) {
        // Days before and after
        const daysBefore = this.dateDiffInDays(firstDay, billDate) + 1;
        const daysAfter = this.dateDiffInDays(billDate, firstDayNext) - 1;

        // Billed cost & volume
        let vol = 0;
        let volNext = 0;
        let cost = 0;
        let costNext = 0;
        
        if ( i == data.length - 1) { // If last entry
          if (type == 'Elec') {
            vol = data[i]['totalKwh'];
          }
          if (type == 'NatGas') {
            vol = data[i]['totalVolume'];
          }
          cost = data[i]['totalCost'];
          
        } else {
          if (type == 'Elec') {
            vol = data[i]['totalKwh'];
            volNext = data[i+1]['totalKwh'];
          }
          if (type == 'NatGas') {
            vol = data[i]['totalVolume'];
            volNext = data[i+1]['totalVolume'];
          }
          cost = data[i]['totalCost'];
          costNext = data[i+1]['totalCost'];
        }

        // Volume per day (billed volume / days in cycle)
        const volPerDay = vol / difference;
        const volPerDayNext = volNext / differenceNext;
        let monthlyVol = volPerDay * daysBefore + volPerDayNext * daysAfter;
        if (isNaN(monthlyVol)) {
          monthlyVol = 0;
        }

        // Cost per day (billed volume / days in cycle)
        const costPerDay = cost / difference;
        const costPerDayNext = costNext / differenceNext;
        let monthlyCost = costPerDay * daysBefore + costPerDayNext * daysAfter;
        if (isNaN(monthlyCost)) {
          monthlyCost = 0;
        }

        this.dataTable.push({
          year: year,
          month: monthName,
          monthKwh: monthlyVol.toFixed(2),
          monthCost: monthlyCost.toFixed(2)
        });

      } else {
        // Show month, but don't calculate.
        this.dataTable.push({
          year: year,
          month: monthName,
          monthKwh: 'NA',
          monthCost: 'NA'
        });
      }
    }
    return this.dataTable;
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
