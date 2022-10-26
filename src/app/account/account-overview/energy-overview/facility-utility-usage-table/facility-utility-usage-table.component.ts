import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbFacility } from 'src/app/models/idb';
import { AccountOverviewService } from '../../account-overview.service';

@Component({
  selector: 'app-facility-utility-usage-table',
  templateUrl: './facility-utility-usage-table.component.html',
  styleUrls: ['./facility-utility-usage-table.component.css']
})
export class FacilityUtilityUsageTableComponent implements OnInit {

  selectedAccountSub: Subscription;
  accountEnergyUnit: string;
  accountFacilitiesSummary: AccountFacilitiesSummary;
  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;

  constructor(private router: Router, private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {

    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      if (val) {
        this.accountEnergyUnit = val.energyUnit;
      }
    });
    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesSummary.subscribe(val => {
      this.accountFacilitiesSummary = val;
      if (this.accountFacilitiesSummary.allMetersLastBill) {
        this.lastMonthsDate = new Date(this.accountFacilitiesSummary.allMetersLastBill.year, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(this.accountFacilitiesSummary.allMetersLastBill.year - 1, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
      }
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
