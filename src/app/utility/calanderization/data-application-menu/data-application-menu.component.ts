import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { MonthlyData } from 'src/app/models/calanderization';

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
  firstMonthEnergyUse: number;
  startDate: { year: number, month: number, day: number };
  secondBillReadDate: Date;
  secondMonthEnergyUse: number;
  thirdBillReadDate: Date;
  thirdMonthEnergyUse: number;
  monthlyData: Array<MonthlyData>;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private calanderizationService: CalanderizationService) { }

  ngOnInit(): void {
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(this.meter, false);
    this.utilityMeterData = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    if(this.utilityMeterData.length != 0){
      if(!this.meter.meterReadingDataApplication){
        this.meter.meterReadingDataApplication = 'fullMonth';
      }
      this.firstBillReadDate = new Date(this.utilityMeterData[0].readDate);
      this.secondBillReadDate = new Date(this.utilityMeterData[1].readDate);
      this.thirdBillReadDate = new Date(this.utilityMeterData[2].readDate);
      this.startDate = { year: this.firstBillReadDate.getUTCFullYear(), month: this.firstBillReadDate.getUTCMonth() + 1, day: this.firstBillReadDate.getUTCDate() };
      this.calanderizeMeter();
    }
  }

  calanderizeMeter() {
    let meterData: Array<IdbUtilityMeterData> = [this.utilityMeterData[0], this.utilityMeterData[1], this.utilityMeterData[2]];
    this.monthlyData = this.calanderizationService.calanderizeMeterData(this.meter, meterData);
  }

  checkSameDate(firstDate: Date, secondDate: Date): boolean {
    return ((firstDate.getUTCMonth() == secondDate.getUTCMonth()) && (firstDate.getUTCDate() == secondDate.getUTCDate()))
  }

  checkSameMonth(firstDate: Date, secondDate: Date): boolean {
    return firstDate.getUTCMonth() == secondDate.getUTCMonth();
  }

  checkPreviousDate(firstDate: Date, secondDate: Date): boolean {
    if (firstDate.getUTCMonth() == secondDate.getUTCMonth()) {
      return firstDate.getUTCDate() > secondDate.getUTCDate()
    } else {
      return firstDate.getUTCMonth() > secondDate.getUTCMonth();
    }
  }

  checkLaterDate(firstDate: Date, secondDate: Date): boolean {
    if (firstDate.getUTCMonth() == secondDate.getUTCMonth()) {
      return firstDate.getUTCDate() < secondDate.getUTCDate()
    } else {
      return firstDate.getUTCMonth() < secondDate.getUTCMonth();
    }
  }

  getBackground(ngbDate: NgbDateStruct): string {
    let date: Date = new Date(ngbDate.year, ngbDate.month - 1, ngbDate.day);
    return this.getDateBackground(date)
  }

  getDateBackground(date: Date, isForTable?: boolean): string {
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
          return '#BA4A00';
        }
      }
    }
    if (isForTable) {
      let isSameDate: boolean = this.checkSameMonth(this.firstBillReadDate, date);
      if (isSameDate) {
        return 'blue';
      } else {
        isSameDate = this.checkSameMonth(this.secondBillReadDate, date);
        if (isSameDate) {
          return 'green';
        } else {
          isSameDate = this.checkSameMonth(this.thirdBillReadDate, date);
          if (isSameDate) {
            return '#BA4A00';
          }
        }
      }
    }
    if (this.meter.meterReadingDataApplication == 'fullMonth') {
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
            return '#F0B27A';
          }
        }
      }
    } else if (this.meter.meterReadingDataApplication == 'backward') {
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
            return '#F0B27A';
          }
        }
      }
    } else if (this.meter.meterReadingDataApplication == 'forward') {
      let isSameDate: boolean = this.checkLaterDate(this.thirdBillReadDate, date);
      if (isSameDate) {
        return '#F0B27A';
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
}
