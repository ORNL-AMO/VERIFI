import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount } from 'src/app/models/idb';
import { MeterSummaryService } from 'src/app/shared/helper-services/meter-summary.service';

@Component({
  selector: 'app-account-report-facility-summary-table',
  templateUrl: './account-report-facility-summary-table.component.html',
  styleUrls: ['./account-report-facility-summary-table.component.css']
})
export class AccountReportFacilitySummaryTableComponent implements OnInit {
 
  accountFacilitiesSub: Subscription;
  accountMeterDataSub: Subscription;
  selectedAccountSub: Subscription;
  accountEnergyUnit: string;
  accountFacilitiesSummary: AccountFacilitiesSummary = {
    facilitySummaries: [],
    totalEnergyUse: undefined,
    totalEnergyCost: undefined,
    totalNumberOfMeters: undefined,
    totalEmissions: undefined,
    allMetersLastBill: undefined
  };
  lastMonthsDate: Date;
  yearPriorDate: Date;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService,
     private accountdbService: AccountdbService, private meterSummaryService: MeterSummaryService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(val => {
      if (val) {
        this.accountEnergyUnit = val.energyUnit;
      }
    });

    this.accountFacilitiesSub = this.facilityDbService.accountFacilities.subscribe(accountFacilities => {
      if (accountFacilities && accountFacilities.length != 0) {
        this.setAccountFacilities();
      } else {
        this.setEmpty()
      }
    });

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      if (val && val.length != 0) {
        this.setAccountFacilities();
      } else {
        this.setEmpty()
      }
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSub.unsubscribe();
    this.accountMeterDataSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  setAccountFacilities() {
    this.accountFacilitiesSummary = this.meterSummaryService.getAccountFacilitesSummary();
    if (this.accountFacilitiesSummary.allMetersLastBill) {
      this.lastMonthsDate = new Date(this.accountFacilitiesSummary.allMetersLastBill.year, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
      this.yearPriorDate = new Date(this.accountFacilitiesSummary.allMetersLastBill.year - 1, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
    }
  }

  setEmpty() {
    this.accountFacilitiesSummary = {
      facilitySummaries: [],
      totalEnergyUse: undefined,
      totalEnergyCost: undefined,
      totalNumberOfMeters: undefined,
      totalEmissions: undefined,
      allMetersLastBill: undefined
    };
    this.lastMonthsDate = undefined;
    this.yearPriorDate = undefined;

  }
}
