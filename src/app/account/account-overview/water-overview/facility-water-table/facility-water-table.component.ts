import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbFacility } from 'src/app/models/idb';
import { AccountOverviewService } from '../../account-overview.service';

@Component({
  selector: 'app-facility-water-table',
  templateUrl: './facility-water-table.component.html',
  styleUrls: ['./facility-water-table.component.css']
})
export class FacilityWaterTableComponent implements OnInit {

  selectedAccountSub: Subscription;
  waterUnit: string;
  accountFacilitiesSummary: AccountFacilitiesSummary;
  accountFacilitiesSummarySub: Subscription;

  constructor(private router: Router, private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      if (val) {
        this.waterUnit = val.volumeLiquidUnit;
      }
    });
    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesWaterSummary.subscribe(val => {
      this.accountFacilitiesSummary = val;
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSummarySub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  selectFacility(facility: IdbFacility) {
    this.router.navigateByUrl('facility/' + facility.id);
  }
}
