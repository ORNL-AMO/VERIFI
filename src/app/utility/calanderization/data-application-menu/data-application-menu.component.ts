import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-data-application-menu',
  templateUrl: './data-application-menu.component.html',
  styleUrls: ['./data-application-menu.component.css']
})
export class DataApplicationMenuComponent implements OnInit {
  @Input()
  meter: IdbUtilityMeter;

  utilityMeterData: Array<IdbUtilityMeterData>;
  firstBillReadDate: Date;
  startDate: { year: number, month: number, day: number };
  secondBillReadDate: Date;
  thirdBillReadDate: Date;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(this.meter, false);
    this.utilityMeterData = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    this.firstBillReadDate = new Date(meterData[0].readDate);
    this.secondBillReadDate = new Date(meterData[1].readDate);
    this.thirdBillReadDate = new Date(meterData[2].readDate);
    this.setStartDate();
    console.log(this.firstBillReadDate);
  }

  setStartDate(){
    if(this.meter.meterReadingDataApplication == 'fullMonth' || !this.meter.meterReadingDataApplication){
      this.startDate = { year: this.firstBillReadDate.getUTCFullYear(), month: this.firstBillReadDate.getUTCMonth() + 1, day: this.firstBillReadDate.getUTCDate() };
    }else if(this.meter.meterReadingDataApplication == 'forward'){
      this.startDate = { year: this.firstBillReadDate.getUTCFullYear(), month: this.firstBillReadDate.getUTCMonth() + 1, day: this.firstBillReadDate.getUTCDate() };
    }else if(this.meter.meterReadingDataApplication == 'backward'){
      this.startDate = { year: this.firstBillReadDate.getUTCFullYear(), month: this.firstBillReadDate.getUTCMonth(), day: this.firstBillReadDate.getUTCDate() };      
    }
  }

  
  getDateBackground(ngbDate: NgbDateStruct) {
    let date: Date = new Date(ngbDate.year, ngbDate.month - 1, ngbDate.day);
    let isSameDate: boolean = this.checkSameDate(this.firstBillReadDate, date);
    if (isSameDate) {
      return 'blue';
    } else {
      isSameDate = this.checkSameDate(this.secondBillReadDate, date);
      if (isSameDate) {
        return 'green';
      } else {
        isSameDate = this.checkSameDate(this.thirdBillReadDate, date);
        if (isSameDate) {
          return 'purple';
        }
      }
    }
    if(this.meter.meterReadingDataApplication == 'fullMonth'){
      let isSameDate: boolean = this.checkSameMonth(this.firstBillReadDate, date);
      if (isSameDate) {
        return 'lightblue';
      } else {
        isSameDate = this.checkSameMonth(this.secondBillReadDate, date);
        if (isSameDate) {
          return 'lightgreen';
        } else {
          isSameDate = this.checkSameMonth(this.thirdBillReadDate, date);
          if (isSameDate) {
            return 'magenta';
          }
        }
      }
    }else if(this.meter.meterReadingDataApplication == 'backward'){
      let isSameDate: boolean = this.checkPreviousDate(this.firstBillReadDate, date);
      if (isSameDate) {
        return 'lightblue';
      } else {
        isSameDate = this.checkPreviousDate(this.secondBillReadDate, date);
        if (isSameDate) {
          return 'lightgreen';
        } else {
          isSameDate = this.checkPreviousDate(this.thirdBillReadDate, date);
          if (isSameDate) {
            return 'magenta';
          }
        }
      }
    }else if(this.meter.meterReadingDataApplication == 'forward'){
      let isSameDate: boolean = this.checkLaterDate(this.thirdBillReadDate, date);
      if (isSameDate) {
        return 'magenta';
      } else {
        isSameDate = this.checkLaterDate(this.secondBillReadDate, date);
        if (isSameDate) {
          return 'lightgreen';
        } else {
          isSameDate = this.checkLaterDate(this.firstBillReadDate, date);
          if (isSameDate) {
            return 'lightblue';
          }
        }
      }
    }
    return 'lightgray'
  }


  checkSameDate(firstDate: Date, secondDate: Date): boolean {
    return ((firstDate.getUTCMonth() == secondDate.getUTCMonth()) && (firstDate.getUTCDate() == secondDate.getUTCDate()))
  }

  checkSameMonth(firstDate: Date, secondDate: Date): boolean {
    return firstDate.getUTCMonth() == secondDate.getUTCMonth();
  }

  checkPreviousDate(firstDate: Date, secondDate: Date): boolean {
    if(firstDate.getUTCMonth() == secondDate.getUTCMonth()){
      return firstDate.getUTCDate() > secondDate.getUTCDate()
    }else{
      return firstDate.getUTCMonth() > secondDate.getUTCMonth();
    }
  }

  
  checkLaterDate(firstDate: Date, secondDate: Date): boolean {
    if(firstDate.getUTCMonth() == secondDate.getUTCMonth()){
      return firstDate.getUTCDate() < secondDate.getUTCDate()
    }else{
      return firstDate.getUTCMonth() < secondDate.getUTCMonth();
    }
  }
}
