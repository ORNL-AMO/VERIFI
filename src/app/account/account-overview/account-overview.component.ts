import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountOverviewService } from './account-overview.service';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, MeterSource } from 'src/app/models/idb';
import { Router } from '@angular/router';
import { AccountSummaryClass } from 'src/app/calculations/dashboard-calculations/accountSummaryClass';

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
  constructor(private accountDbService: AccountdbService, private accountOverviewService: AccountOverviewService,
    private facilityDbService: FacilitydbService, private router: Router) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      this.accountOverviewService.setCalanderizedMeters();
      if (this.accountOverviewService.calanderizedMeters.length != 0) {
        this.noUtilityData = false;
        this.calculateFacilitiesSummary();
      } else {
        this.noUtilityData = true;
      }
    });
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  calculateFacilitiesSummary() {
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
        } else if (data.type == 'all') {
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

      let energySources: Array<MeterSource> = ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy']
      this.worker.postMessage({
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        facilities: facilities,
        sources: energySources,
        type: 'energy',
        account: this.account
      });

      let waterSources: Array<MeterSource> = [
        "Water",
        "Waste Water"
      ];
      this.worker.postMessage({
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        facilities: facilities,
        sources: waterSources,
        type: 'water',
        account: this.account
      });

      let allSources: Array<MeterSource> = [
        "Electricity",
        "Natural Gas",
        "Other Fuels",
        "Other Energy",
        "Water",
        "Waste Water",
        "Other Utility"
      ]
      this.worker.postMessage({
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        facilities: facilities,
        sources: allSources,
        type: 'all',
        account: this.account
      });
    } else {
      // Web Workers are not supported in this environment.
      let energySources: Array<MeterSource> = ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy']
      let energySummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountOverviewService.calanderizedMeters, facilities, energySources, this.account);
      this.accountOverviewService.accountFacilitiesEnergySummary.next(energySummaryClass.facilitiesSummary);
      this.accountOverviewService.energyUtilityUsageSummaryData.next(energySummaryClass.utilityUsageSummaryData);
      this.accountOverviewService.energyYearMonthData.next(energySummaryClass.yearMonthData);
      let waterSources: Array<MeterSource> = [
        "Water",
        "Waste Water"
      ];
      let waterSummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountOverviewService.calanderizedMeters, facilities, waterSources, this.account);
      this.accountOverviewService.accountFacilitiesWaterSummary.next(waterSummaryClass.facilitiesSummary);
      this.accountOverviewService.waterUtilityUsageSummaryData.next(waterSummaryClass.utilityUsageSummaryData);
      this.accountOverviewService.waterYearMonthData.next(waterSummaryClass.yearMonthData);
      let allSources: Array<MeterSource> = [
        "Electricity",
        "Natural Gas",
        "Other Fuels",
        "Other Energy",
        "Water",
        "Waste Water",
        "Other Utility"
      ]
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
