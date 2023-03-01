import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountOverviewService } from './account-overview.service';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { Router } from '@angular/router';

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
    private facilityDbService: FacilitydbService, private router: Router) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      this.accountOverviewService.setCalanderizedMeters();
      if (this.accountOverviewService.calanderizedMeters.length != 0) {
        this.noUtilityData = false;
        if (this.dateRange) {
          this.calculateFacilitiesSummary();
        }
      } else {
        this.noUtilityData = true;
      }
    });

    this.dateRangeSub = this.accountOverviewService.dateRange.subscribe(dateRange => {
      this.dateRange = dateRange;
      if (this.dateRange) {
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
    this.accountOverviewService.dateRange.next(undefined);
    this.accountOverviewService.utilityUseAndCost.next(undefined);
  }

  calculateFacilitiesSummary() {
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
        dateRange: this.dateRange
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
}
