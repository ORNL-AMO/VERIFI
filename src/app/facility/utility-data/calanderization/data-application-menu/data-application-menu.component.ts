import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { CalanderizationService, CalendarizationSummaryItem } from 'src/app/shared/helper-services/calanderization.service';
import { MonthlyData } from 'src/app/models/calanderization';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

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
  fourthBillReadDate: Date;
  monthlyData: Array<MonthlyData>;
  calanderizationSummary: Array<CalendarizationSummaryItem>;
  displayMonths: number = 4;
  hoverDataDate: Date;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private calanderizationService: CalanderizationService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(this.meter, false);
    this.utilityMeterData = _.orderBy(meterData, (data) => { return new Date(data.readDate) }, 'asc');
    if (this.utilityMeterData.length > 2) {
      if (!this.meter.meterReadingDataApplication) {
        this.meter.meterReadingDataApplication = 'fullMonth';
      }
      this.firstBillReadDate = new Date(this.utilityMeterData[0].readDate);
      this.secondBillReadDate = new Date(this.utilityMeterData[1].readDate);
      this.thirdBillReadDate = new Date(this.utilityMeterData[2].readDate);
      if (this.utilityMeterData.length > 3) {
        this.fourthBillReadDate = new Date(this.utilityMeterData[3].readDate);
      } else {
        this.displayMonths = 3;
      }
      this.startDate = { year: this.firstBillReadDate.getUTCFullYear(), month: this.firstBillReadDate.getUTCMonth() + 1, day: this.firstBillReadDate.getUTCDate() };
      this.calanderizeMeter();
    }
  }

  calanderizeMeter() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.monthlyData = this.calanderizationService.calanderizeMeterData(this.meter, this.utilityMeterData, selectedFacility.energyIsSource, selectedFacility.energyUnit, false, false);
    if (this.meter.meterReadingDataApplication == 'backward') {
      this.monthlyData = this.monthlyData.splice(0, 2);
    } else {
      this.monthlyData = this.monthlyData.splice(0, 4);
    }
    this.calanderizationSummary = this.calanderizationService.getCalendarizationSummary(this.meter, this.utilityMeterData);
  }

  checkSameDate(firstDate: Date, secondDate: Date): boolean {
    return ((firstDate.getUTCMonth() == secondDate.getUTCMonth()) && (firstDate.getDate() == secondDate.getDate()))
  }

  checkSameMonth(firstDate: Date, secondDate: Date): boolean {
    return firstDate.getUTCMonth() == secondDate.getUTCMonth();
  }

  checkPreviousDate(firstDate: Date, secondDate: Date): boolean {
    if (firstDate.getUTCFullYear() == secondDate.getUTCFullYear()) {
      if (firstDate.getUTCMonth() == secondDate.getUTCMonth()) {
        return firstDate.getUTCDate() > secondDate.getUTCDate()
      } else {
        return firstDate.getUTCMonth() > secondDate.getUTCMonth();
      }
    } else {
      return firstDate.getUTCFullYear() > secondDate.getUTCFullYear();
    }
  }

  checkLaterDate(firstDate: Date, secondDate: Date): boolean {
    if (firstDate.getUTCFullYear() == secondDate.getUTCFullYear()) {
      if (firstDate.getUTCMonth() == secondDate.getUTCMonth()) {
        return firstDate.getDate() < secondDate.getDate()
      } else {
        return firstDate.getUTCMonth() < secondDate.getUTCMonth();
      }
    } else {
      return firstDate.getUTCFullYear() < secondDate.getUTCFullYear();
    }
  }

  getBackground(ngbDate: NgbDateStruct): string {
    let date: Date = new Date(ngbDate.year, ngbDate.month - 1, ngbDate.day);
    return this.getDateBackground(date)
  }

  getDateBackground(date: Date): string {
    let isSameDate: boolean = this.checkSameDate(this.firstBillReadDate, date);
    if (isSameDate) {
      return 'purple';
    } else {
      isSameDate = this.checkSameDate(this.secondBillReadDate, date);
      if (isSameDate) {
        return 'green';
      } else {
        isSameDate = this.checkSameDate(this.thirdBillReadDate, date);
        if (isSameDate) {
          return '#BA4A00';
        } else if (this.fourthBillReadDate) {
          isSameDate = this.checkSameDate(this.fourthBillReadDate, date);
          if (isSameDate) {
            return 'blue';
          }
        }
      }
    }

    if (this.meter.meterReadingDataApplication == 'fullMonth') {
      let isSameDate: boolean = this.checkSameMonth(this.firstBillReadDate, date);
      if (isSameDate) {
        return '#D2B4DE';
      } else {
        isSameDate = this.checkSameMonth(this.secondBillReadDate, date);
        if (isSameDate) {
          return 'lightgreen';
        } else {
          isSameDate = this.checkSameMonth(this.thirdBillReadDate, date);
          if (isSameDate) {
            return '#F0B27A';
          } else if (this.fourthBillReadDate) {
            isSameDate = this.checkSameMonth(this.fourthBillReadDate, date);
            if (isSameDate) {
              return 'lightblue';
            }
          }
        }
      }
    } else if (this.meter.meterReadingDataApplication == 'backward') {
      let isSameDate: boolean = this.checkPreviousDate(this.firstBillReadDate, date);
      if (isSameDate) {
        return 'lightgray';
      } else {
        isSameDate = this.checkPreviousDate(this.secondBillReadDate, date);
        if (isSameDate) {
          return 'lightgreen';
        } else {
          isSameDate = this.checkPreviousDate(this.thirdBillReadDate, date);
          if (isSameDate) {
            return '#F0B27A';
          } else if (this.fourthBillReadDate) {
            isSameDate = this.checkPreviousDate(this.fourthBillReadDate, date);
            if (isSameDate) {
              return 'lightblue';
            }
          }
        }
      }
    } 
    return 'lightgray'
  }

  inspectDate(date: Date) {
    this.hoverDataDate = new Date(date);
  }

  isHoverDate(checkDate: Date): boolean {
    if (this.hoverDataDate) {
      return this.checkSameMonth(new Date(checkDate), this.hoverDataDate);
    } else {
      return false;
    }
  }

  getMonthClass(date: Date): string {
    let isSameDate: boolean = this.checkSameMonth(this.firstBillReadDate, date);
    if (isSameDate) {
      return 'month-one';
    } else {
      isSameDate = this.checkSameMonth(this.secondBillReadDate, date);
      if (isSameDate) {
        return 'month-two';
      } else {
        isSameDate = this.checkSameMonth(this.thirdBillReadDate, date);
        if (isSameDate) {
          return 'month-three';
        } else if (this.fourthBillReadDate) {
          isSameDate = this.checkSameMonth(this.fourthBillReadDate, date);
          if (isSameDate) {
            return 'month-four';
          }
        }
      }
    }
  }

  getTableCellClass(checkDate: Date, readDate: Date): Array<string> {
    let cellClass: Array<string> = [];
    let isHoverDate: boolean = this.isHoverDate(checkDate);
    if (isHoverDate) {
      cellClass.push('highlighted-date');
      let monthClass: string = this.getMonthClass(new Date(readDate));
      cellClass.push(monthClass);
    }
    return cellClass;
  }

  getBorder(ngbDate: NgbDateStruct): string {
    let date: Date = new Date(ngbDate.year, ngbDate.month - 1, ngbDate.day);
    if (this.hoverDataDate) {
      let isSameMonth: boolean = this.checkSameMonth(date, this.hoverDataDate);
      if (isSameMonth) {
        return 'solid 3px black'
      }
    }
    return '';
  }

  hoverDate(ngbDate: NgbDateStruct) {
    let date: Date = new Date(ngbDate.year, ngbDate.month - 1, ngbDate.day);
    this.inspectDate(date);
  }
}
