import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbFacility } from 'src/app/models/idb';
import { AccountOverviewService } from '../../account-overview.service';
@Component({
  selector: 'app-facility-cost-table',
  templateUrl: './facility-cost-table.component.html',
  styleUrls: ['./facility-cost-table.component.css']
})
export class FacilityCostTableComponent implements OnInit {

  accountFacilitiesSummary: AccountFacilitiesSummary;
  accountFacilitiesSummarySub: Subscription;

  constructor(private router: Router, private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesEnergySummary.subscribe(val => {
      this.accountFacilitiesSummary = val;
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSummarySub.unsubscribe();
  }

  selectFacility(facility: IdbFacility) {
    this.router.navigateByUrl('facility/' + facility.id);
  }
}
