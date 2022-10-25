import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-utility-usage-table',
  templateUrl: './facility-utility-usage-table.component.html',
  styleUrls: ['./facility-utility-usage-table.component.css']
})
export class FacilityUtilityUsageTableComponent implements OnInit {

  selectedAccountSub: Subscription;
  accountEnergyUnit: string;
  accountFacilitiesSummary: AccountFacilitiesSummary = {
    facilitySummaries: [],
    totalEnergyUse: undefined,
    totalEnergyCost: undefined,
    totalNumberOfMeters: undefined,
    totalLocationEmissions: undefined,
    totalMarketEmissions: undefined,
    allMetersLastBill: undefined
  };
  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  selectFacility(facility: IdbFacility) {
    this.router.navigateByUrl('facility/' + facility.id);
  }
}
