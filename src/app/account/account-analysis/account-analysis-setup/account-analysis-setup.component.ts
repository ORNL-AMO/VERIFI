import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem } from 'src/app/models/idb';
import { Month, Months } from 'src/app/shared/form-data/months';
import { EnergyUnitOptions, UnitOption, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { AccountAnalysisService } from '../account-analysis.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { firstValueFrom } from 'rxjs';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-account-analysis-setup',
  templateUrl: './account-analysis-setup.component.html',
  styleUrls: ['./account-analysis-setup.component.css']
})
export class AccountAnalysisSetupComponent implements OnInit {

  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  waterUnitOptions: Array<UnitOption> = VolumeLiquidOptions;
  months: Array<Month> = Months;

  account: IdbAccount;
  energyUnit: string;
  analysisItem: IdbAccountAnalysisItem;
  yearOptions: Array<number>;
  baselineYearWarning: string;
  constructor(private accountDbService: AccountdbService, private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router, private accountAnalysisService: AccountAnalysisService,
    private dbChangesService: DbChangesService,
    private analysisDbService: AnalysisDbService,
    private analysisValidationService: AnalysisValidationService,
    private calendarizationService: CalanderizationService) { }

  ngOnInit(): void {
    this.analysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    if (!this.analysisItem) {
      this.router.navigateByUrl('/account/analysis/dashboard')
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.energyUnit = this.account.energyUnit;
    this.yearOptions = this.calendarizationService.getYearOptionsAccount(this.analysisItem.analysisCategory);
    this.setBaselineYearWarning();
  }

  async saveItem() {
    let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    this.analysisItem.setupErrors = this.analysisValidationService.getAccountAnalysisSetupErrors(this.analysisItem, analysisItems);
    await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(this.analysisItem));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountAnalysisItems(account, false);
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.analysisItem);
    this.setBaselineYearWarning();
  }

  async changeReportYear() {
    if (this.analysisItem.baselineYear < this.analysisItem.reportYear) {
      let yearAdjustments: Array<{ year: number, amount: number }> = new Array();
      for (let year: number = this.analysisItem.baselineYear + 1; year <= this.analysisItem.reportYear; year++) {
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
        return (accountItem.reportYear == this.analysisItem.reportYear
          && accountItem.facilityId == item.facilityId
          && accountItem.selectedYearAnalysis
          && accountItem.baselineYear == this.analysisItem.baselineYear
          && accountItem.analysisCategory == this.analysisItem.analysisCategory);
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

  setBaselineYearWarning() {
    if (this.analysisItem.analysisCategory == 'water') {
      if (this.analysisItem.baselineYear && this.account.sustainabilityQuestions.waterReductionGoal && this.account.sustainabilityQuestions.waterReductionBaselineYear != this.analysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your corporate baseline year. This analysis cannot be included in reports or figures relating to the corporate water goal."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else if (this.analysisItem.analysisCategory == 'energy') {
      if (this.analysisItem.baselineYear && this.account.sustainabilityQuestions.energyReductionGoal && this.account.sustainabilityQuestions.energyReductionBaselineYear != this.analysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your corporate baseline year. This analysis cannot be included in reports or figures relating to the corporate energy goal."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else {
      this.baselineYearWarning = undefined;
    }
  }
}
