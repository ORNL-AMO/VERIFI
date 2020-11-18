import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';
import { FacilityService } from '../account/facility/facility.service';
import { UtilityMeterdbService } from "../indexedDB/utilityMeter-db-service";
import { UtilityMeterDatadbService } from "../indexedDB/utilityMeterData-db-service";
import { LoadingService } from "../shared/loading/loading.service";
import { ConvertUnitsService } from 'src/app/shared/convert-units/convert-units.service';

@Injectable({
  providedIn: 'root'
})
export class UtilityService {
  private autoIncrementor: number
  private facilityid: number;

  public meterList = new BehaviorSubject([]); // Stage 1 get meters
  public meterData = new BehaviorSubject([]); // Stage 2 get raw data
  public meterRawCalendarData = new BehaviorSubject([]); // Stage 3 calculate calendar data (stays in ori unit)
  public meterCalendarData = new BehaviorSubject([]); // Stage 4 calculate calendar data (units will change)
  public meterObj = new BehaviorSubject([]); // Used for frontend easy ngFor
  //public meterGroups = new BehaviorSubject([]); // Stage 5 get groups

  public energyFinalUnit = new BehaviorSubject('MMBtu'); // Set default

  constructor(
    private localStorage: LocalStorageService,
    private facilityService: FacilityService,
    private loadingService: LoadingService,
    public utilityMeterdbService: UtilityMeterdbService,
    private convertUnitsService: ConvertUnitsService,
    public utilityMeterDatadbService: UtilityMeterDatadbService) {

    // Observe the facilityid var
    // this.facilityService.getValue().subscribe((value) => {
    //   this.facilityid = value;
    // });

    // Keep users state
    // if (this.localStorage.retrieve('verifi_meterList')) {
    //   this.meterList.next(this.localStorage.retrieve('verifi_meterList'));
    // }
    // // Keep users state
    // if (this.localStorage.retrieve('verifi_meterData')) {
    //   this.meterData.next(this.localStorage.retrieve('verifi_meterData'));
    // }
    // // Keep users state
    // if (this.localStorage.retrieve('verifi_meterRawCalendarData')) {
    //   this.meterRawCalendarData.next(this.localStorage.retrieve('verifi_meterRawCalendarData'));
    // }
    // // Keep users state
    // if (this.localStorage.retrieve('verifi_meterCalendarData')) {
    //   this.meterCalendarData.next(this.localStorage.retrieve('verifi_meterCalendarData'));
    // }
    // // Keep users state
    // if (this.localStorage.retrieve('verifi_meterObj')) {
    //   this.meterObj.next(this.localStorage.retrieve('verifi_meterObj'));
    // }
    // // Keep users state
    // if (this.localStorage.retrieve('verifi_energyFinalUnit')) {
    //   this.energyFinalUnit.next(this.localStorage.retrieve('verifi_energyFinalUnit'));
    // }
  }

  /* Final Units */
  getEnergyFinalUnit(): Observable<any> {
    if (this.energyFinalUnit.value == "") {
      this.setMeterList();
    }
    return this.energyFinalUnit.asObservable();
  }

  setEnergyFinalUnit(value): void {
    this.localStorage.store('verifi_energyFinalUnit', value);
    this.energyFinalUnit.next(value);
  }

  /* Meter Lists */
  getMeterList(): Observable<any> {
    // Query meters if first time
    if (this.meterList.value.length == 0) {
      this.setMeterList();
    }
    // List all meters
    return this.meterList.asObservable();
  }

  refreshMeterList(data): void {
    // Quick Refresh
    this.localStorage.store('verifi_meterList', data);
    this.meterList.next(data);
  }

  setMeterList(): void {
    // Query all meters
    this.utilityMeterdbService.getAllByIndexRange('facilityId', this.facilityid).subscribe(
      data => {
        this.localStorage.store('verifi_meterList', data);
        this.meterList.next(data);

        // Cascading Updates
        this.setDisplayObj();

      },
      error => {
        console.log(error);
      }
    );
  }

  /* Raw Meter Data */
  getMeterData(): Observable<any> {
    // Query meters if first time
    if (this.meterData.value.length == 0) {
      this.setMeterData();
    }
    // List all Data
    return this.meterData.asObservable();
  }

  refreshMeterData(data): void {
    // Quick Refresh
    this.localStorage.store('verifi_meterData', data);
    this.meterData.next(data);
  }

  setMeterData(): void {
    // Query all meter data
    this.utilityMeterDatadbService.getAllByIndexRange('facilityId', this.facilityid).subscribe(
      data => {
        this.localStorage.store('verifi_meterData', data);
        this.meterData.next(data);

        // Cascading Updates
        this.setCalendarData();

      },
      error => {
        console.log(error);
      }
    );
  }

  /* Calendarization */
  getRawCalendarData(): Observable<any> {
    // List all meters
    return this.meterRawCalendarData.asObservable();
  }

  getCalendarData(): Observable<any> {
    // Query meters if first time
    if (this.meterCalendarData.value.length == 0) {
      this.setCalendarData();
    }
    // List all meters
    return this.meterCalendarData.asObservable();
  }

  refreshCalendarData(data): void {
    // Quick Refresh
    this.localStorage.store('verifi_meterCalendarData', data);
    this.meterCalendarData.next(data);
  }

  setCalendarData(): void {
    let calendarize = [];
    const meters = this.meterList.value;
    const tempMeterData = this.meterData.value;
    this.autoIncrementor = 1;

    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Calendarizing Data...");

    // if meter list is empty for loop wont run
    if (meters.length < 1) {
      this.loadingService.setLoadingStatus(false);
    }

    for (let i = 0; i < meters.length; i++) {
      // filter meter data based on meterid
      let data = tempMeterData.filter(function (obj) {
        return obj.meterid == meters[i]['id'];
      });

      // Push calculated calendar data
      const calData = this.calendarization(data, meters[i]['id']);
      calendarize.push(...calData);

      // If last iteration, set new observable value and end loading screen
      if (i === meters.length - 1) {
        this.localStorage.store('verifi_meterRawCalendarData', calendarize);
        this.localStorage.store('verifi_meterCalendarData', calendarize);

        this.meterRawCalendarData.next(calendarize); // Store this value for the "Monthly Meter Data" page
        this.meterCalendarData.next(calendarize); // This value moves forward and is unit converted.
        this.loadingService.setLoadingStatus(false);
      }
    }
    // Cascading Updates
    this.setDisplayObj();
    this.convertUnits();
  }

  sortByDate(a, b) {
    return new Date(a.readDate).getTime() - new Date(b.readDate).getTime();
  }

  calendarization(data, meterid) {
    let dataTable = [];

    for (let i = 1; i < data.length - 1; i++) {
      this.autoIncrementor++;

      let billDate = new Date(data[i]['readDate']);
      let billDateNext = new Date(data[i]['readDate']);;
      let billDatePrev = new Date(data[i]['readDate']);;

      const monthName = billDate.toLocaleString('default', { month: 'long' });
      const year = billDate.getFullYear();

      // End of billing cycle (meter read date)
      // prevent errors on 1st and last entry
      if (i == 0) {
        billDateNext = new Date(data[i + 1]['readDate']);
        billDatePrev.setMonth(billDatePrev.getMonth() - 1);
      } else if (i == data.length - 1) {
        billDateNext.setMonth(billDateNext.getMonth() + 1);
        billDatePrev = new Date(data[i - 1]['readDate']);
      } else {
        billDateNext = new Date(data[i + 1]['readDate']);
        billDatePrev = new Date(data[i - 1]['readDate']);
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

        if (i == data.length - 1) { // If last entry
          vol = data[i]['totalEnergyUse'];
          cost = data[i]['totalCost'];
        } else {
          vol = data[i]['totalEnergyUse'];
          volNext = data[i + 1]['totalEnergyUse'];
          cost = data[i]['totalCost'];
          costNext = data[i + 1]['totalCost'];
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
          id: this.autoIncrementor,
          meterid: meterid,
          year: year,
          month: monthName,
          monthEnergy: monthlyVol.toFixed(2),
          monthCost: monthlyCost.toFixed(2)
        });

      } else {
        // Show month, but don't calculate.
        dataTable.push({
          id: this.autoIncrementor,
          meterid: meterid,
          year: year,
          month: monthName,
          monthEnergy: 'NA',
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

  getDisplayObj(): Observable<any> {
    // Set meterObj if empty
    if (this.meterObj.value.length == 0) {
      this.setDisplayObj();
    }
    // Create meter object
    return this.meterObj.asObservable();
  }

  refreshDisplayObj(meterObj): void {
    // Quick Refresh
    this.localStorage.store('verifi_meterObj', meterObj);
    this.meterObj.next(meterObj);
  }

  // Use this to generate JSON Objects for the frontend.
  setDisplayObj(): void {
    let meters = JSON.parse(JSON.stringify(this.meterList.value));
    const tempMeterData = this.meterData.value;
    const tempMeterRawCal = this.meterRawCalendarData.value;

    // loop each meter
    for (let i = 0; i < meters.length; i++) {
      // filter meterData data based on meterid
      let data = tempMeterData.filter(function (obj) {
        return obj.meterid == meters[i]['id'];
      });
      // filter meterCal data based on meterid
      let cal = tempMeterRawCal.filter(function (obj) {
        return obj.meterid == meters[i]['id'];
      });

      // add data/calendar to meter object 
      meters[i]['calendarization'] = cal;
      meters[i]['data'] = data;

      // go ahead and sort it
      meters[i]['calendarization'].sort(this.sortByDate);
      meters[i]['data'].sort(this.sortByDate);
    }

    this.localStorage.store('verifi_meterObj', meters);
    this.meterObj.next(meters);
  }

  convertUnits(): void {
    console.log("converting");

    let meters = JSON.parse(JSON.stringify(this.meterList.value));
    let startingUnit = "";
    let finalUnit = "";
    const tempMeterRawCal = JSON.parse(JSON.stringify(this.meterCalendarData.value));

    // loop each meter
    for (let i = 0; i < meters.length; i++) {
      // filter meterCal data based on meterid
      let data = tempMeterRawCal.filter(function (obj) {
        return obj.meterid == meters[i]['id'];
      });

      startingUnit = meters[i]["startingUnit"]; // from unit
      finalUnit = meters[i]["finalUnit"]; // from unit
      //console.log(startingUnit + " -> " + finalUnit);
      console.log("final Unit");
      console.log(finalUnit);
      this.convertCal(data, startingUnit, finalUnit);
      //this.convertCal(data, 'kWh', 'MMBtu');
    }
  }

  // Converts whole meter
  convertCal(data, from, to): void {
    let index = 0;
    let value = 0;
    let conversion = {};
    let tempMeterCalendarData = JSON.parse(JSON.stringify(this.meterCalendarData.value));

    // Each meter's data is sent via the data variable. This allows meters to have different to and from units.
    // Each meter is converted independently then is replaced in the main meterCalendarData service one at a time.
    for (let i = 0; i < data.length; i++) {
      value = data[i]['monthEnergy'];
      conversion = Math.round(this.convertUnitsService.value(value).from(from).to(to));
      // find corresponding row
      index = tempMeterCalendarData.map(function (obj) { return obj.id; }).indexOf(data[i]['id']);
      //replace row
      tempMeterCalendarData[index]['monthEnergy'] = conversion;
    }

    // Create meter object
    this.meterCalendarData.next(tempMeterCalendarData);
    this.localStorage.store('verifi_meterCalendarData', tempMeterCalendarData);
  }
}