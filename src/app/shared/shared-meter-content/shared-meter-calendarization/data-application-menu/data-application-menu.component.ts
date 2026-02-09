import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import * as _ from 'lodash';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { CalanderizationService, CalendarizationSummaryItem } from 'src/app/shared/helper-services/calanderization.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { getDateFromMeterData } from 'src/app/shared/dateHelperFunctions';

@Component({
  selector: 'app-data-application-menu',
  templateUrl: './data-application-menu.component.html',
  styleUrls: ['./data-application-menu.component.css'],
  standalone: false
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
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.meter.guid);
    this.utilityMeterData = _.orderBy(meterData, (data: IdbUtilityMeterData) => { return getDateFromMeterData(data) }, 'asc');
    if (this.utilityMeterData.length > 2) {
      if (!this.meter.meterReadingDataApplication) {
        this.meter.meterReadingDataApplication = 'fullMonth';
      }
      this.firstBillReadDate = getDateFromMeterData(this.utilityMeterData[0]);
      this.secondBillReadDate = getDateFromMeterData(this.utilityMeterData[1]);
      this.thirdBillReadDate = getDateFromMeterData(this.utilityMeterData[2]);
      if (this.utilityMeterData.length > 3) {
        this.fourthBillReadDate = getDateFromMeterData(this.utilityMeterData[3]);
      } else {
        this.displayMonths = 3;
      }
      this.startDate = { year: this.firstBillReadDate.getFullYear(), month: this.firstBillReadDate.getMonth() + 1, day: this.firstBillReadDate.getDate() };
      this.calanderizeMeter();
    }
  }

  calanderizeMeter() {
    if (this.utilityMeterData.length > 2) {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      let calanderizedData: Array<CalanderizedMeter> = getCalanderizedMeterData([this.meter], this.utilityMeterData, selectedFacility, false, undefined, [], [], [selectedFacility], account.assessmentReportVersion, []);
      this.monthlyData = calanderizedData[0].monthlyData;
      if (this.meter.meterReadingDataApplication == 'backward') {
        this.monthlyData = this.monthlyData.splice(0, 2);
      } else {
        this.monthlyData = this.monthlyData.splice(0, 4);
      }
      this.calanderizationSummary = this.calanderizationService.getCalendarizationSummary(this.meter, this.utilityMeterData);
    }
  }

  checkSameDate(firstDate: Date, secondDate: Date): boolean {
    return ((firstDate.getMonth() == secondDate.getMonth()) && (firstDate.getDate() == secondDate.getDate()))
  }

  checkSameMonth(firstDate: Date, secondDate: Date): boolean {
    return firstDate.getMonth() == secondDate.getMonth();
  }

  checkPreviousDate(firstDate: Date, secondDate: Date): boolean {
    return firstDate.getTime() > secondDate.getTime();
  }

  checkLaterDate(firstDate: Date, secondDate: Date): boolean {
    return firstDate.getTime() < secondDate.getTime();
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
