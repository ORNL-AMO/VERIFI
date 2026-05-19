import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import * as _ from 'lodash';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { CalanderizationService, CalendarizationSummaryItem } from 'src/app/shared/helper-services/calanderization.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getDateFromMeterData } from 'src/app/shared/dateHelperFunctions';
import { daysBetweenDates, getCurrentMonthsReadings, getNextMonthsBill, getPreviousMonthsBill } from 'src/app/calculations/calanderization/calanderizationHelpers';
import { getIsEnergyMeter, getIsEnergyUnit } from 'src/app/shared/sharedHelperFunctions';

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
    private facilityDbService: FacilitydbService) { }

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
      let calanderizedData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMetersByFacilityID(selectedFacility.guid);
      this.monthlyData = calanderizedData[0].monthlyData;
      if (this.meter.meterReadingDataApplication == 'backward') {
        this.monthlyData = this.monthlyData.splice(0, 2);
      } else {
        this.monthlyData = this.monthlyData.splice(0, 4);
      }
      this.calanderizationSummary = this.getCalendarizationSummary(this.meter, this.utilityMeterData);
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

  //CALANDERIZATION SUMMARIES USED BY CALANDERIZATION MODAL
  getCalendarizationSummary(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): Array<CalendarizationSummaryItem> {
    if (meter.meterReadingDataApplication == 'fullMonth' || !meter.meterReadingDataApplication) {
      //used as default
      return this.calanderizationSummaryFullMonth(meter, meterData);
    } else if (meter.meterReadingDataApplication == 'backward') {
      return this.calanderizationSummaryBackwards(meterData);
    }
  }

  calanderizationSummaryBackwards(meterData: Array<IdbUtilityMeterData>): Array<CalendarizationSummaryItem> {
    let calanderizationSummary: Array<CalendarizationSummaryItem> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data: IdbUtilityMeterData) => { return getDateFromMeterData(data).getTime() });
    if (orderedMeterData.length > 3) {
      let startDate: Date = getDateFromMeterData(orderedMeterData[0]);
      startDate.setMonth(startDate.getMonth() + 1);

      let endDate: Date = new Date(startDate.getFullYear(), startDate.getMonth() + 2);
      while (startDate < endDate) {
        let month: number = startDate.getMonth();
        let year: number = startDate.getFullYear();
        let previousMonthReading: IdbUtilityMeterData = getPreviousMonthsBill(month, year, orderedMeterData);
        let currentMonthsReadings: Array<IdbUtilityMeterData> = getCurrentMonthsReadings(month, year, orderedMeterData);
        let nextMonthsReading: IdbUtilityMeterData = getNextMonthsBill(month, year, orderedMeterData);
        if (nextMonthsReading) {
          if (currentMonthsReadings.length == 1) {
            //1. current month has 1 bill
            let currentMonthReading: IdbUtilityMeterData = currentMonthsReadings[0];
            let calanderizationSummaryItem: CalendarizationSummaryItem = this.getCalanderizationSummaryItem(previousMonthReading, currentMonthReading, nextMonthsReading, year, month);
            calanderizationSummary.push(calanderizationSummaryItem);

          } else if (currentMonthsReadings.length > 1) {
            //2. current month has multiple bills
            let calanderizationSummaryItem: CalendarizationSummaryItem = {
              calanderizedMonth: new Date(year, month),
              monthReadingSummaries: [],
              totalEnergyUse: 0
            }
            for (let readingIndex = 0; readingIndex < currentMonthsReadings.length; readingIndex++) {
              let currentMonthReading: IdbUtilityMeterData;
              let nextReading: IdbUtilityMeterData;
              if (readingIndex == 0) {
                currentMonthReading = currentMonthsReadings[readingIndex];
                nextReading = currentMonthsReadings[readingIndex + 1];
              } else if (readingIndex == (currentMonthsReadings.length - 1)) {
                previousMonthReading = currentMonthsReadings[readingIndex - 1];
                currentMonthReading = currentMonthsReadings[readingIndex];
                nextReading = nextMonthsReading;
              } else {
                previousMonthReading = currentMonthsReadings[readingIndex - 1];
                currentMonthReading = currentMonthsReadings[readingIndex];
                nextReading = currentMonthsReadings[readingIndex + 1];
              }
              let tmpSummary: CalendarizationSummaryItem = this.getCalanderizationSummaryItem(previousMonthReading, currentMonthReading, nextReading, year, month);
              calanderizationSummaryItem.monthReadingSummaries = calanderizationSummaryItem.monthReadingSummaries.concat(tmpSummary.monthReadingSummaries);
            }
            calanderizationSummaryItem.monthReadingSummaries = _.uniqWith(calanderizationSummaryItem.monthReadingSummaries, _.isEqual)
            calanderizationSummaryItem.totalEnergyUse = _.sumBy(calanderizationSummaryItem.monthReadingSummaries, (summary) => { return summary.totalEnergyFromBill })
            calanderizationSummary.push(calanderizationSummaryItem);
          } else if (currentMonthsReadings.length == 0) {
            //3. current month has 0 bills
            //find number of days between next month and previous month
            let previousBillDate: Date = getDateFromMeterData(previousMonthReading);
            let nextBillDate: Date = getDateFromMeterData(nextMonthsReading);
            let daysBetween: number = daysBetweenDates(previousBillDate, nextBillDate);
            //find per day energy use
            let energyUsePerDay: number = nextMonthsReading.totalEnergyUse / daysBetween;
            //find number of days in current month
            let currentMonthDate1: Date = new Date(year, month);
            let currentMonthDate2: Date = new Date(year, month + 1);
            let daysInMonth: number = daysBetweenDates(currentMonthDate1, currentMonthDate2);
            //multiply per day by number of days in current month
            let energyUseForMonth: number = energyUsePerDay * daysInMonth;
            calanderizationSummary.push({
              calanderizedMonth: new Date(year, month),
              monthReadingSummaries: [{
                readDate: getDateFromMeterData(nextMonthsReading),
                daysInBill: daysBetween,
                energyUsePerDay: energyUsePerDay,
                daysApplied: daysInMonth,
                totalEnergyFromBill: energyUseForMonth
              }],
              totalEnergyUse: energyUseForMonth
            });
          }
        }
        startDate.setMonth(startDate.getMonth() + 1);
      }
    }
    return calanderizationSummary;
  }

  getCalanderizationSummaryItem(previousReading: IdbUtilityMeterData, currentReading: IdbUtilityMeterData, nextReading: IdbUtilityMeterData, year: number, month: number): CalendarizationSummaryItem {
    let currentDate: Date = getDateFromMeterData(currentReading);
    let previousReadingDate: Date = getDateFromMeterData(previousReading);
    //days from previous to current bill reading
    let daysFromPrevious: number = daysBetweenDates(previousReadingDate, currentDate);
    //find per day energy use
    let energyUsePerDayCurrent: number = currentReading.totalEnergyUse / daysFromPrevious;
    //apply number of days of current bill
    let daysFromCurrent: number = currentDate.getDate();
    if (currentDate.getMonth() == previousReadingDate.getMonth()) {
      daysFromCurrent = currentDate.getDate() - previousReadingDate.getDate();
    }
    let energyUseForCurrent: number = energyUsePerDayCurrent * daysFromCurrent;

    //days from next bill to current bill reading
    let nextMonthsDate: Date = getDateFromMeterData(nextReading);
    let daysFromNext: number = daysBetweenDates(currentDate, nextMonthsDate);
    //find days per energy use
    let energyUsePerDayNext: number = nextReading.totalEnergyUse / daysFromNext;
    //apply number of days of current bill (days left of month or untill next reading)
    if (nextMonthsDate.getMonth() != currentDate.getMonth()) {
      //if next months reading need to find until beginning of that month
      //otherwise just will be untill that day
      nextMonthsDate.setMonth(currentDate.getMonth() + 1);
      nextMonthsDate.setDate(0);
      nextMonthsDate.setFullYear(currentDate.getFullYear());
    }
    let daysTillNext: number = daysBetweenDates(currentDate, nextMonthsDate);
    let energyUseForMonthNext: number = energyUsePerDayNext * daysTillNext;

    return {
      calanderizedMonth: new Date(year, month),
      monthReadingSummaries: [
        {
          readDate: getDateFromMeterData(currentReading),
          daysInBill: daysFromPrevious,
          energyUsePerDay: energyUsePerDayCurrent,
          daysApplied: daysFromCurrent,
          totalEnergyFromBill: energyUseForCurrent
        },
        {
          readDate: getDateFromMeterData(nextReading),
          daysInBill: daysFromNext,
          energyUsePerDay: energyUsePerDayNext,
          daysApplied: daysTillNext,
          totalEnergyFromBill: energyUseForMonthNext
        }
      ],
      totalEnergyUse: energyUseForCurrent + energyUseForMonthNext
    };
  }


  calanderizationSummaryFullMonth(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): Array<CalendarizationSummaryItem> {
    let calanderizationSummary: Array<CalendarizationSummaryItem> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data: IdbUtilityMeterData) => { return getDateFromMeterData(data) });
    if (orderedMeterData.length != 0) {
      let startDate: Date = getDateFromMeterData(orderedMeterData[0]);
      startDate.setMonth(startDate.getMonth() + 1);

      let endDate: Date = new Date(startDate.getFullYear(), startDate.getMonth() + 2);
      while (startDate < endDate) {
        let month: number = startDate.getMonth();
        let year: number = startDate.getFullYear();
        let monthReadingSummaries: Array<{
          readDate: Date,
          daysInBill: number,
          energyUsePerDay: number,
          daysApplied: number,
          totalEnergyFromBill: number
        }> = new Array();
        let currentMonthsReadings: Array<IdbUtilityMeterData> = getCurrentMonthsReadings(month, year, orderedMeterData);
        currentMonthsReadings.forEach(reading => {
          let totalMonthEnergyConsumption: number = 0;
          let totalMonthEnergyUse: number = 0;

          //energy use
          let isEnergyMeter: boolean = getIsEnergyMeter(meter.source);
          if (isEnergyMeter) {
            totalMonthEnergyUse = reading.totalEnergyUse;
          }
          //energy consumption (data input not as energy)
          let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
          if (!isEnergyUnit) {
            totalMonthEnergyConsumption = reading.totalVolume;
          } else {
            totalMonthEnergyConsumption = totalMonthEnergyUse;
          }
          let startOfMonth: Date = getDateFromMeterData(reading);
          startOfMonth.setDate(1);
          let nextMonth: Date = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1);
          let daysInMonth: number = daysBetweenDates(startOfMonth, nextMonth);
          monthReadingSummaries.push({
            readDate: getDateFromMeterData(reading),
            energyUsePerDay: totalMonthEnergyConsumption / daysInMonth,
            daysApplied: daysInMonth,
            totalEnergyFromBill: totalMonthEnergyConsumption,
            daysInBill: daysInMonth
          })

        })
        calanderizationSummary.push({
          calanderizedMonth: new Date(year, month),
          monthReadingSummaries: monthReadingSummaries,
          totalEnergyUse: _.sumBy(monthReadingSummaries, 'totalEnergyFromBill')
        });
        startDate.setMonth(startDate.getMonth() + 1);
      }
    }
    return calanderizationSummary;
  }

}
