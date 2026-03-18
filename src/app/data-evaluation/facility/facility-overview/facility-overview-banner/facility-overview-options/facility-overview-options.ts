import { Component } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityOverviewService } from '../../facility-overview.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { Month, Months } from 'src/app/shared/form-data/months';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-facility-overview-options',
  standalone: false,
  templateUrl: './facility-overview-options.html',
  styleUrl: './facility-overview-options.css',
})
export class FacilityOverviewOptions {

  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  minMonth: number;
  minYear: number;
  maxMonth: number;
  maxYear: number;
  months: Array<Month> = Months;
  years: Array<number>;
  errorMessage: string = '';
  dateRangeSub: Subscription;
  displayMenu: boolean = true;

  account: IdbAccount;
  accountSub: Subscription;
  constructor(private facilityDbService: FacilitydbService,
    private facilityOverviewService: FacilityOverviewService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService) { }

  ngOnInit() {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.setYears();
    });

    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    })

    this.dateRangeSub = this.facilityOverviewService.dateRange.subscribe(dateRange => {
      if (dateRange) {
        this.minMonth = dateRange.startDate.getMonth();
        this.minYear = dateRange.startDate.getFullYear();
        this.maxMonth = dateRange.endDate.getMonth();
        this.maxYear = dateRange.endDate.getFullYear();
      }
    });

    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
    this.dateRangeSub.unsubscribe();
    this.accountSub.unsubscribe();
  }

  async setFacilityEnergyIsSource() {
    await this.dbChangesService.updateFacilities(this.selectedFacility);
  }

  setEmissions() {
    this.facilityOverviewService.emissionsDisplay.next(this.emissionsDisplay);
  }
  //date validation
  setDate() {
    let startDate: Date = new Date(this.minYear, this.minMonth, 1);
    let endDate: Date = new Date(this.maxYear, this.maxMonth, 1);

    // compare start and end date
    if (startDate.getTime() >= endDate.getTime()) {
      this.errorMessage = 'Start date cannot be later than the end date';
      return;
    }

    this.errorMessage = '';

    // Proceed with valid date range
    this.facilityOverviewService.dateRange.next({
      startDate: startDate,
      endDate: endDate
    });
  }

  setYears() {
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let allYears: Array<number> = facilityMeterData.flatMap(meterData => { return meterData.year });
    allYears = _.uniq(allYears);
    this.years = _.orderBy(allYears, (year) => { return year }, 'desc');
  }
}
