import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisCalculationsHelperService } from 'src/app/facility/analysis/calculations/analysis-calculations-helper.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import { Month, Months } from 'src/app/shared/form-data/months';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';

@Component({
  selector: 'app-account-analysis-setup',
  templateUrl: './account-analysis-setup.component.html',
  styleUrls: ['./account-analysis-setup.component.css']
})
export class AccountAnalysisSetupComponent implements OnInit {

  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  months: Array<Month> = Months;

  account: IdbAccount;
  energyUnit: string;
  analysisItem: IdbAccountAnalysisItem;
  yearOptions: Array<number>;
  constructor(private accountDbService: AccountdbService, private accountAnalysisDbService: AccountAnalysisDbService,
    private analysisCalculationsHelperService: AnalysisCalculationsHelperService,
    private router: Router) { }

  ngOnInit(): void {
    this.analysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();    
    if (!this.analysisItem) {
      this.router.navigateByUrl('/account/analysis/dashboard')
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.energyUnit = this.account.energyUnit;
    this.yearOptions = this.analysisCalculationsHelperService.getYearOptions(true);
  }

  saveItem() {
    this.accountAnalysisDbService.update(this.analysisItem);
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.analysisItem);
  }
}
