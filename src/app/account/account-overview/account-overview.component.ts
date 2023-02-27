import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountOverviewService } from './account-overview.service';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AllSources, EnergySources, IdbAccount, IdbFacility, MeterSource, WaterSources } from 'src/app/models/idb';
import { Router } from '@angular/router';
import { AccountSummaryClass } from 'src/app/calculations/dashboard-calculations/accountSummaryClass';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';

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
  constructor(private accountDbService: AccountdbService, private accountOverviewService: AccountOverviewService,
    private facilityDbService: FacilitydbService, private router: Router) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      this.accountOverviewService.setCalanderizedMeters();
      // if (this.accountOverviewService.calanderizedMeters.length != 0) {
      //   this.noUtilityData = false;
      //   this.calculateFacilitiesSummary();
      // } else {
      //   this.noUtilityData = true;
      // }
    });

    this.dateRangeSub = this.accountOverviewService.dateRange.subscribe(dateRange => {
      if (dateRange) {
        // let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        // let test = new AccountOverviewData(this.accountOverviewService.calanderizedMeters, facilities, this.account, dateRange);
        this.calculateFacilitiesSummary(dateRange);
      }
    });
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.dateRangeSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  calculateFacilitiesSummary(dateRange: { startDate: Date, endDate: Date }) {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/account-overview.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.accountOverviewService.accountOverviewData.next(data.accountOverviewData);
        this.accountOverviewService.utilityUseAndCost.next(data.utilityUseAndCost);
        this.accountOverviewService.calculatingAccountOverviewData.next(false);
        this.worker.terminate();
      };

      //only show calculating spinner if no data calculated yet
      if (this.accountOverviewService.accountOverviewData.getValue() == undefined) {
        this.accountOverviewService.calculatingAccountOverviewData.next(true);
      }
      this.worker.postMessage({
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        facilities: facilities,
        type: 'overview',
        dateRange: dateRange
      });


    } else {
      // Web Workers are not supported in this environment.
      // let energySources: Array<MeterSource> = EnergySources;
      // let energySummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountOverviewService.calanderizedMeters, facilities, energySources, this.account);
      //      this.accountOverviewService.energyYearMonthData.next(energySummaryClass.yearMonthData);
      // let waterSources: Array<MeterSource> = WaterSources;
      // let waterSummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountOverviewService.calanderizedMeters, facilities, waterSources, this.account);
      // this.accountOverviewService.waterYearMonthData.next(waterSummaryClass.yearMonthData);
      // let allSources: Array<MeterSource> = AllSources;
      // let allSummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountOverviewService.calanderizedMeters, facilities, allSources, this.account);
      // this.accountOverviewService.costsYearMonthData.next(allSummaryClass.yearMonthData);
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
