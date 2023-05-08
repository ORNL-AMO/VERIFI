import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem } from 'src/app/models/idb';
import { Month, Months } from 'src/app/shared/form-data/months';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import { AccountAnalysisService } from '../account-analysis.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { firstValueFrom } from 'rxjs';

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
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private router: Router, private accountAnalysisService: AccountAnalysisService,
    private dbChangesService: DbChangesService,
    private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.analysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    if (!this.analysisItem) {
      this.router.navigateByUrl('/account/analysis/dashboard')
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.energyUnit = this.account.energyUnit;
    this.yearOptions = this.utilityMeterDataDbService.getYearOptions(true);
  }

  async saveItem() {
    await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(this.analysisItem));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountAnalysisItems(account);
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.analysisItem);
  }

  async changeReportYear() {
    if (this.account.sustainabilityQuestions.energyReductionBaselineYear < this.analysisItem.reportYear) {
      let yearAdjustments: Array<{ year: number, amount: number }> = new Array();
      for (let year: number = this.account.sustainabilityQuestions.energyReductionBaselineYear + 1; year <= this.analysisItem.reportYear; year++) {
        yearAdjustments.push({
          year: year,
          amount: 0
        })
      }
      this.analysisItem.baselineAdjustments = yearAdjustments;
    }
    await this.resetFacilityItems();
  }

  async resetFacilityItems() {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    this.analysisItem.facilityAnalysisItems.forEach(item => {
      let facilityItem: IdbAnalysisItem = accountAnalysisItems.find(accountItem => {
        return accountItem.reportYear == this.analysisItem.reportYear && accountItem.facilityId == item.facilityId && accountItem.selectedYearAnalysis;
      });
      if (facilityItem) {
        item.analysisItemId = facilityItem.guid;
      } else {
        item.analysisItemId = undefined;
      }
    });
    await this.saveItem();
  }

  async changeSiteSource() {
    await this.resetFacilityItems();
    this.accountAnalysisService.setCalanderizedMeters();
  }

}
