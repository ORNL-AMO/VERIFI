import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountOverviewService } from './account-overview.service';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-account-overview',
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.css']
})
export class AccountOverviewComponent implements OnInit {

  accountSub: Subscription;
  worker: Worker;
  calculating: boolean;
  constructor(private accountDbService: AccountdbService, private accountOverviewService: AccountOverviewService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      console.time('calanderize');
      this.accountOverviewService.setCalanderizedMeters();
      console.timeEnd('calanderize');
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
        this.accountOverviewService.accountFacilitiesSummary.next(data);
        this.accountOverviewService.calculatingFacilitiesSummary.next(false);
        this.calculating = false;
        this.worker.terminate();
      };
      this.accountOverviewService.calculatingFacilitiesSummary.next(true);
      this.worker.postMessage({
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        facilities: facilities,
      });
    } else {
      console.log('nopee')

      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  }
}
