import { Component, OnInit } from '@angular/core';
import { AccountOverviewService } from '../account-overview.service';
import { Subscription } from 'rxjs';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
@Component({
  selector: 'app-energy-overview',
  templateUrl: './energy-overview.component.html',
  styleUrls: ['./energy-overview.component.css']
})
export class EnergyOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  accountFacilitiesSummary: AccountFacilitiesSummary;
  energyUnit: string;
  selectedAccountSub: Subscription;

  constructor(private accountOverviewService: AccountOverviewService, private accountDbService: AccountdbService) { }

  ngOnInit(): void {  
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      if (val) {
        this.energyUnit = val.energyUnit;
      }
    });
    this.calculatingSub = this.accountOverviewService.calculatingEnergy.subscribe(val => {
      this.calculating = val;
    });

    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesEnergySummary.subscribe(accountFacilitiesSummary => {
      this.accountFacilitiesSummary = accountFacilitiesSummary;
      if (accountFacilitiesSummary.allMetersLastBill) {
        this.lastMonthsDate = new Date(accountFacilitiesSummary.allMetersLastBill.year, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(accountFacilitiesSummary.allMetersLastBill.year - 1, accountFacilitiesSummary.allMetersLastBill.monthNumValue + 1);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
      }
    });
  }

  ngOnDestroy(){
    this.accountFacilitiesSummarySub.unsubscribe();
    this.calculatingSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

}
