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
        if (data.type == 'energy') {
          this.accountOverviewService.accountFacilitiesEnergySummary.next(data.accountFacilitiesSummary);
          this.accountOverviewService.energyUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
          this.accountOverviewService.energyYearMonthData.next(data.yearMonthData);
          this.accountOverviewService.calculatingEnergy.next(false);
        } else if (data.type == 'water') {
          this.accountOverviewService.accountFacilitiesWaterSummary.next(data.accountFacilitiesSummary);
          this.accountOverviewService.waterUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
          this.accountOverviewService.waterYearMonthData.next(data.yearMonthData);
          this.accountOverviewService.calculatingWater.next(false);
        } else if (data.type == 'overview') {
          console.log(data);
          this.accountOverviewService.accountOverviewData.next(data.accountOverviewData);
          this.accountOverviewService.calculatingAccountOverviewData.next(false);
          this.worker.terminate();
        }
        else if (data.type == 'all') {
          this.accountOverviewService.accountFacilitiesCostsSummary.next(data.accountFacilitiesSummary);
          this.accountOverviewService.costsUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
          this.accountOverviewService.costsYearMonthData.next(data.yearMonthData);
          this.accountOverviewService.calculatingCosts.next(false);
          this.worker.terminate();
        }
      };
      this.accountOverviewService.calculatingEnergy.next(true);
      this.accountOverviewService.calculatingWater.next(true);
      this.accountOverviewService.calculatingCosts.next(true);
      this.accountOverviewService.calculatingAccountOverviewData.next(true);

      let energySources: Array<MeterSource> = EnergySources;
      this.worker.postMessage({
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        facilities: facilities,
        sources: energySources,
        type: 'energy',
        account: this.account
      });

      let waterSources: Array<MeterSource> = WaterSources;
      this.worker.postMessage({
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        facilities: facilities,
        sources: waterSources,
        type: 'water',
        account: this.account
      });

      let allSources: Array<MeterSource> = AllSources;
      this.worker.postMessage({
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        facilities: facilities,
        type: 'overview',
        dateRange: dateRange
      });

      this.worker.postMessage({
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        facilities: facilities,
        sources: allSources,
        type: 'all',
        account: this.account
      });

      // let allSources: Array<MeterSource> = AllSources;



    } else {
      // Web Workers are not supported in this environment.
      let energySources: Array<MeterSource> = EnergySources;
      let energySummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountOverviewService.calanderizedMeters, facilities, energySources, this.account);
      this.accountOverviewService.accountFacilitiesEnergySummary.next(energySummaryClass.facilitiesSummary);
      this.accountOverviewService.energyUtilityUsageSummaryData.next(energySummaryClass.utilityUsageSummaryData);
      this.accountOverviewService.energyYearMonthData.next(energySummaryClass.yearMonthData);
      let waterSources: Array<MeterSource> = WaterSources;
      let waterSummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountOverviewService.calanderizedMeters, facilities, waterSources, this.account);
      this.accountOverviewService.accountFacilitiesWaterSummary.next(waterSummaryClass.facilitiesSummary);
      this.accountOverviewService.waterUtilityUsageSummaryData.next(waterSummaryClass.utilityUsageSummaryData);
      this.accountOverviewService.waterYearMonthData.next(waterSummaryClass.yearMonthData);
      let allSources: Array<MeterSource> = AllSources;
      let allSummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountOverviewService.calanderizedMeters, facilities, allSources, this.account);
      this.accountOverviewService.accountFacilitiesCostsSummary.next(allSummaryClass.facilitiesSummary);
      this.accountOverviewService.costsUtilityUsageSummaryData.next(allSummaryClass.utilityUsageSummaryData);
      this.accountOverviewService.costsYearMonthData.next(allSummaryClass.yearMonthData);
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
