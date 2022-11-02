import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountOverviewService } from './account-overview.service';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, MeterSource } from 'src/app/models/idb';

@Component({
  selector: 'app-account-overview',
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.css']
})
export class AccountOverviewComponent implements OnInit {

  accountSub: Subscription;
  worker: Worker;
  constructor(private accountDbService: AccountdbService, private accountOverviewService: AccountOverviewService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.accountOverviewService.setCalanderizedMeters();
      this.calculateFacilitiesSummary();
    });
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  calculateFacilitiesSummary() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/account-overview.worker', import.meta.url));
      let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
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
        type: 'energy'
      });

      let waterSources: Array<MeterSource> = [
        "Water",
        "Waste Water"
      ];
      this.worker.postMessage({
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        facilities: facilities,
        sources: waterSources,
        type: 'water'
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
        type: 'all'
      });
    } else {
      console.log('nopee')

      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  }
}
