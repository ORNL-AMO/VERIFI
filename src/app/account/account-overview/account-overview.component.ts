import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountOverviewService } from './account-overview.service';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { Router } from '@angular/router';
import * as _ from 'lodash';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';

@Component({
    selector: 'app-account-overview',
    templateUrl: './account-overview.component.html',
    styleUrls: ['./account-overview.component.css'],
    standalone: false
})
export class AccountOverviewComponent implements OnInit {

  accountSub: Subscription;
  worker: Worker;
  noUtilityData: boolean;
  account: IdbAccount;

  dateRangeSub: Subscription;
  dateRange: { startDate: Date, endDate: Date };
  customFuels: Array<IdbCustomFuel>;
  constructor(private accountDbService: AccountdbService, private accountOverviewService: AccountOverviewService,
    private facilityDbService: FacilitydbService, private router: Router, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private eGridService: EGridService,
    private customFuelDbService: CustomFuelDbService) { }

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
    let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
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
        inOverview: true,
        co2Emissions: this.eGridService.co2Emissions,
        customFuels: customFuels
      });


    } else {
      // Web Workers are not supported in this environment.
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, this.account, true, { energyIsSource: this.account.energyIsSource, neededUnits: undefined }, this.eGridService.co2Emissions, customFuels, facilities);
      if (!this.dateRange) {
        if (calanderizedMeters && calanderizedMeters.length > 0) {
          let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(val => { return val.monthlyData });
          let latestData: MonthlyData = _.maxBy(monthlyData, 'date');
          let maxDate: Date = new Date(latestData.year, latestData.monthNumValue);
          let minDate: Date = new Date(maxDate.getUTCFullYear() - 1, maxDate.getMonth(), 1);
          minDate.setMonth(minDate.getMonth() + 1);
          this.dateRange = {
            endDate: maxDate,
            startDate: minDate
          };
          this.accountOverviewService.dateRange.next(this.dateRange);
        }
      }
      let accountOverviewData: AccountOverviewData = new AccountOverviewData(calanderizedMeters, facilities, this.account, this.dateRange);
      let utilityUseAndCost: UtilityUseAndCost = new UtilityUseAndCost(calanderizedMeters, this.dateRange);
      this.accountOverviewService.accountOverviewData.next(accountOverviewData);
      this.accountOverviewService.utilityUseAndCost.next(utilityUseAndCost);
      this.accountOverviewService.calculating.next(false);
    }
  }

  addUtilityData() {
    //TODO: Update select facility call
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilities.length > 0) {
      this.router.navigateByUrl('facility/' + facilities[0].id + '/utility');
    }
  }
}
