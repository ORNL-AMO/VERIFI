import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';
import { FacilityService } from '../account/facility/facility.service';
import { UtilityMeterdbService } from "../indexedDB/utilityMeter-db-service";
import { UtilityMeterDatadbService } from "../indexedDB/utilityMeterData-db-service";
import { LoadingService } from "../shared/loading/loading.service";

@Injectable({
    providedIn: 'root'
})
export class UtilityService {
  private facilityid: number;
  public meterOnly = new BehaviorSubject([]);
  public meterList = new BehaviorSubject([]);
  public meterData = new BehaviorSubject([]);
  public calendarData = new BehaviorSubject([]);
  
    
  constructor(
    private localStorage:LocalStorageService,
    private facilityService: FacilityService,
    private loadingService : LoadingService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService) {
        // Observe the facilityid var
        this.facilityService.getValue().subscribe((value) => {
            this.facilityid = value;
        });
     }
  
    getMeters(): Observable<any> {
      // Query meters if first time
      if (this.meterList.value.length == 0) {
          this.refreshMeters();
      }
      // List all meters
      return this.meterList.asObservable();
    }

    // Only refresh all the data when a new meter bill is added.
    refreshMeters(): void {
      // Query all meters
      this.utilityMeterdbService.getAllByIndex(this.facilityid).then(
          data => {
          //this.localStorage.store('meterList', data);
          //this.meterList.next(data);
          this.setCalendarData(data);
          },
          error => {
              console.log(error);
          }
      );
  }

    refreshMeterData(): void {
      // Query all meters
      this.utilityMeterdbService.getAllByIndex(this.facilityid).then(
          data => {
          //this.localStorage.store('meterList', data);
          //this.meterList.next(data);
          this.setMeterData(data);
          this.setCalendarData(data); // TEMP FIX
          },
          error => {
              console.log(error);
          }
      );
  }



/* Raw Meter Data. Only used for utilities/energySource/[energy] */
    getMeterData(): Observable<any> {
      // Query meters if first time
      if (this.meterData.value.length == 0) {
          this.refreshMeterData();
      }
      // List all meters
      return this.meterData.asObservable();
    }

    setMeterData(meters): void {
      let counter = 1; // keeps track of the end of the loop (async)
      this.loadingService.setLoadingStatus(true);
      this.loadingService.setLoadingMessage("Fetching Meter Data...");

      // if meter list is empty for loop wont run
      if(meters.length < 1 ) {
        this.loadingService.setLoadingStatus(false);
        this.meterData.next([]);
      }

        // loop each meter
        for (let i=0; i < meters.length; i++) {
            // filter meter data based on meterid
            this.utilityMeterDatadbService.getAllByIndex(meters[i]['id']).then(
              data => {
                counter++;

                // push to meterlist object
                meters[i]['data'] = data;
                meters[i]['data'].sort(this.sortByDate);

                // If last iteration, set new observable value and end loading screen
                if(counter === meters.length || meters.length < 2) {
                  this.meterData.next(meters);
                  this.loadingService.setLoadingStatus(false);
                }
                
              },
              error => {
                  console.log(error);
              }
            );
        }
    }

/* Calendarization */

    getCalendarData(): Observable<any> {
      // List all meters
      return this.calendarData.asObservable();
    }

    setCalendarData(meters) {
      let counter = 1; // keeps track of the end of the loop (async)
      this.loadingService.setLoadingStatus(true);
      this.loadingService.setLoadingMessage("Fetching Calendarized Data...");
      let calendarize = [];

      // if meter list is empty for loop wont run
      if(meters.length < 1 ) {
        this.loadingService.setLoadingStatus(false);
        this.meterList.next([]);
      }

      for (let i=0; i < meters.length; i++) {
          // filter meter data based on meterid
          this.utilityMeterDatadbService.getAllByIndex(meters[i]['id']).then(
            data => {
              counter++;

              // Push calendar data to its meter. Used for UI ngFor
              //if (this.meterList[i].type == 'Electricity')
              meters[i]['calendarization'] = this.calendarization(data, 'Elec',meters[i]['id']);
              meters[i]['calendarization'].sort(this.sortByDate);

              // Push all calendar data to seperate array.  Used for quick calculations
              const calData = this.calendarization(data, 'Elec',meters[i]['id']);
              calendarize.push(...calData);

              // If last iteration, set new observable value and end loading screen
              // meters.length < 2 because if meter length is 1 counter is already at 2
              if(counter === meters.length || meters.length < 2) { 
                this.meterList.next(meters);
                this.calendarData.next(calendarize);
                this.loadingService.setLoadingStatus(false);
              }
            },
            error => {
                console.log(error);
            }
          );
      }
    }

    sortByDate(a, b) {
        return new Date(a.readDate).getTime() - new Date(b.readDate).getTime();
    }

    calendarization (data, type, meterid) {
      let dataTable = [];
  
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
  
          dataTable.push({
            meterid: meterid,
            year: year,
            month: monthName,
            monthKwh: monthlyVol.toFixed(2),
            monthCost: monthlyCost.toFixed(2)
          });
  
        } else {
          // Show month, but don't calculate.
          dataTable.push({
            meterid: meterid,
            year: year,
            month: monthName,
            monthKwh: 'NA',
            monthCost: 'NA'
          });
        }
      }
      //console.log("async?");
      return dataTable;
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