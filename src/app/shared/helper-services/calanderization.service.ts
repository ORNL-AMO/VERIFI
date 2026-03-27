import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizationFilters, CalanderizedMeter } from 'src/app/models/calanderization';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { getIsEnergyMeter, getIsEnergyUnit } from '../sharedHelperFunctions';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { daysBetweenDates, getCurrentMonthsReadings, getNextMonthsBill, getPreviousMonthsBill } from 'src/app/calculations/calanderization/calanderizationHelpers';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { getDateFromMeterData } from '../dateHelperFunctions';
import { getAllYearsWithData, getYearsWithFullData } from 'src/app/calculations/shared-calculations/calculationsHelpers';

@Injectable({
  providedIn: 'root'
})
export class CalanderizationService {


  calanderizedDataFilters: BehaviorSubject<CalanderizationFilters>;
  displayGraphEnergy: "bar" | "scatter" | null = "bar";
  displayGraphCost: "bar" | "scatter" | null = "bar";
  dataDisplay: "table" | "graph" = 'table';

  calanderizedMeters: BehaviorSubject<Array<CalanderizedMeter>>;
  constructor(
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService,
    private utilityMeterDbService: UtilityMeterdbService) {
    this.calanderizedDataFilters = new BehaviorSubject({
      selectedSources: [],
      showAllSources: true,
      selectedDateMax: undefined,
      selectedDateMin: undefined,
      dataDateRange: undefined
    });

    this.calanderizedMeters = new BehaviorSubject([]);
  }

  getCalanderizedMetersByFacilityID(facilityID: string): Array<CalanderizedMeter> {
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizedMeters.getValue();
    let facilityCalanderizedMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => cMeter.meter.facilityId == facilityID);
    return facilityCalanderizedMeters;
  }

  getCalanderizerMetersByGroupId(groupId: string): Array<CalanderizedMeter> {
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizedMeters.getValue();
    let filteredCalanderizedMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => cMeter.meter.groupId == groupId);
    return filteredCalanderizedMeters;
  }

  getCalanderizedMeterByMeterId(meterId: string): CalanderizedMeter {
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizedMeters.getValue();
    let calanderizedMeter: CalanderizedMeter = calanderizedMeters.find(cMeter => cMeter.meter.guid == meterId);
    return calanderizedMeter;
  }


  getYearOptions(meterCategory: 'water' | 'energy' | 'all', onlyFullYears: boolean, facilityId?: string): Array<number> {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityOrAccount: IdbFacility | IdbAccount;
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilityId) {
      facilityOrAccount = this.facilityDbService.getFacilityById(facilityId);
      meters = meters.filter(meter => {
        return meter.facilityId == facilityId
      });
      accountFacilities = accountFacilities.filter(fac => fac.guid == facilityId);
    } else {
      facilityOrAccount = this.accountDbService.selectedAccount.getValue();
    }
    let categoryMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return this.isCategoryMeter(meter, meterCategory) });
    let categoryMeterIds: Array<string> = categoryMeters.map(meter => { return meter.guid });
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizedMeters.getValue();
    let filteredCalanderizedMeterData: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
      return categoryMeterIds.includes(cMeter.meter.guid)
    });
    if (facilityId) {
      filteredCalanderizedMeterData = filteredCalanderizedMeterData.filter(cMeter => cMeter.meter.facilityId == facilityId);
    }
    let yearsWithFullData: Array<number> = new Array();
    accountFacilities.forEach(facility => {
      if (onlyFullYears) {
        let facilityYearsWithData: Array<number> = getYearsWithFullData(filteredCalanderizedMeterData, facility);
        yearsWithFullData = yearsWithFullData.concat(facilityYearsWithData);
      } else {
        let facilityYearsWithData: Array<number> = getAllYearsWithData(filteredCalanderizedMeterData, facility);
        yearsWithFullData = yearsWithFullData.concat(facilityYearsWithData);
      }
    });
    yearsWithFullData = _.orderBy(yearsWithFullData, (year) => { return year }, 'asc');
    return _.uniq(yearsWithFullData);
  }

  checkReportYearSelection(meterCategory: 'water' | 'energy' | 'all', reportYear: number, onlyFullYears: boolean, facilityId?: string): boolean {
    let yearOptions: Array<number> = this.getYearOptions(meterCategory, onlyFullYears, facilityId);
    return !yearOptions.includes(reportYear);
  }

  isCategoryMeter(meter: IdbUtilityMeter, meterCategory: 'water' | 'energy' | 'all'): boolean {
    if (meterCategory == 'water') {
      if (meter.source == 'Water Intake') {
        return true;
      }
      return false;
    } else if (meterCategory == 'energy') {
      return getIsEnergyMeter(meter.source);
    } else if (meterCategory == 'all') {
      return true;
    }
  }
}

//CalanderizationSummaryItem used in modal to show calanderization method
export interface CalendarizationSummaryItem {
  calanderizedMonth: Date,
  monthReadingSummaries: Array<{
    readDate: Date,
    daysInBill: number,
    energyUsePerDay: number,
    daysApplied: number,
    totalEnergyFromBill: number
  }>
  totalEnergyUse: number
}