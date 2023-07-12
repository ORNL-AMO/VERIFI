import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountOverviewService } from './account-overview.service';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { Router } from '@angular/router';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import * as _ from 'lodash';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

@Component({
  selector: 'app-account-overview',
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.css']
})
export class AccountOverviewComponent implements OnInit {

  accountSub: Subscription;
  worker: Worker;
  noUtilityData: boolean;
  account: IdbAccount;

  dateRangeSub: Subscription;
  dateRange: { startDate: Date, endDate: Date };
  constructor(private accountDbService: AccountdbService, private accountOverviewService: AccountOverviewService,
    private facilityDbService: FacilitydbService, private router: Router, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
      if (accountMeterData.length != 0) {
        this.noUtilityData = false;
        this.calculateFacilitiesSummary();
      } else {
        this.noUtilityData = true;
      }
    });

    this.dateRangeSub = this.accountOverviewService.dateRange.subscribe(dateRange => {
      let needUpdatedSummary: boolean = true;
      if (!this.dateRange) {
        needUpdatedSummary = false;
      }
      this.dateRange = dateRange;
      if (needUpdatedSummary) {
        this.calculateFacilitiesSummary();
      }
    });
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.dateRangeSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
    this.accountOverviewService.accountOverviewData.next(undefined);
    this.accountOverviewService.utilityUseAndCost.next(undefined);
    this.accountOverviewService.dateRange.next(undefined);
  }

  calculateFacilitiesSummary() {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/account-overview.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.accountOverviewService.accountOverviewData.next(data.accountOverviewData);
          this.accountOverviewService.utilityUseAndCost.next(data.utilityUseAndCost);
          if (!this.dateRange) {
            this.accountOverviewService.dateRange.next(data.dateRange);
          }
          this.accountOverviewService.calculating.next(false);
        } else {
          this.accountOverviewService.accountOverviewData.next(undefined);
          this.accountOverviewService.utilityUseAndCost.next(undefined);
          this.accountOverviewService.calculating.next('error');
        }
        this.worker.terminate();
      };

      //only show calculating spinner if no data calculated yet
      if (this.accountOverviewService.accountOverviewData.getValue() == undefined) {
        this.accountOverviewService.calculating.next(true);
      }
      this.worker.postMessage({
        // calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        meters: meters,
        meterData: meterData,
        facilities: facilities,
        type: 'overview',
        dateRange: this.dateRange,
        account: this.account,
        energyIsSource: this.account.energyIsSource,
        inOverview: true
      });


    } else {
      // Web Workers are not supported in this environment.

    }
  }

  addUtilityData() {
    //TODO: Update select facility call
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilities.length > 0) {
      this.router.navigateByUrl('facility/' + facilities[0].id + '/utility');
    }
  }

  // setDateRange() {
  //   let calanderizedMeters: Array<CalanderizedMeter> = this.accountOverviewService.calanderizedMeters;
  //   if (calanderizedMeters && calanderizedMeters.length > 0) {
  //     let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(val => { return val.monthlyData });
  //     let latestData: MonthlyData = _.maxBy(monthlyData, 'date');
  //     let maxDate: Date = new Date(latestData.year, latestData.monthNumValue);
  //     let minDate: Date = new Date(maxDate.getUTCFullYear() - 1, maxDate.getMonth(), 1);
  //     minDate.setMonth(minDate.getMonth() + 1);
  //     this.accountOverviewService.dateRange.next({
  //       endDate: maxDate,
  //       startDate: minDate
  //     });
  //   }
  // }
}
