import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountReportsService } from '../../account-reports.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';

@Component({
  selector: 'app-better-plants-setup',
  templateUrl: './better-plants-setup.component.html',
  styleUrls: ['./better-plants-setup.component.css'],
  standalone: false
})
export class BetterPlantsSetupComponent {

  betterPlantsReportForm: FormGroup;
  account: IdbAccount;
  methodsUndertakenLabel: string = 'Please describe any methods undertaken to normalize energy intensity data or adjust baseline data to account for economic and other factors that affect energy use:';
  modificationNotesLabel: string = 'Please describe the energy efficient technologies, strategies, and practices employed during the previous year to decrease intensity. Please identify systems impacted and approximate savings from projects. (Ex: Furnace insulation project-12,000 MMBtu/yr savings, compressor controls upgrade-6,000 MMBtu/yr, energy awareness campaign, etc):'
  methodologyNotesLabel: string = 'Please describe the methdology used for calculating water intensity improvements:';
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  baselineYearWarning: string;
  analysisItemIdSub: Subscription;

  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private accountAnalysisDbService: AccountAnalysisDbService) {
  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      if (!this.isFormChange) {
        this.betterPlantsReportForm = this.accountReportsService.getBetterPlantsFormFromReport(val.betterPlantsReportSetup);
        this.subscribeAnalysisItemChanges();
        this.setSelectedAnalysisItem();
      } else {
        this.isFormChange = false;
      }
    })
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
    this.analysisItemIdSub.unsubscribe();
  }

  subscribeAnalysisItemChanges() {
    if (this.analysisItemIdSub) {
      this.analysisItemIdSub.unsubscribe();
    }
    
    this.analysisItemIdSub = this.betterPlantsReportForm.controls.analysisItemId.valueChanges.subscribe(async val => {
      await this.save();
    })
  }

  async save() {
    this.isFormChange = true;
    this.setSelectedAnalysisItem();
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    selectedReport.betterPlantsReportSetup = this.accountReportsService.updateBetterPlantsReportFromForm(selectedReport.betterPlantsReportSetup, this.betterPlantsReportForm);
    if (this.selectedAnalysisItem) {
      selectedReport.baselineYear = this.selectedAnalysisItem.baselineYear;
    }
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  setSelectedAnalysisItem() {
    this.selectedAnalysisItem = this.accountAnalysisDbService.getByGuid(this.betterPlantsReportForm.controls.analysisItemId.value);
    if (this.selectedAnalysisItem && this.selectedAnalysisItem.analysisCategory == 'water') {
      this.methodsUndertakenLabel = 'If a baseline adjustment was made, please indicate the reason for making the adjustment';
      this.modificationNotesLabel = 'Please briefly describe major technologies, strategies, and practices employed during the previous year to decrease water intensity. Please identify: systems/processes impacted, approximate water savings from projects, and implementation cost';
    } else if (this.selectedAnalysisItem && this.selectedAnalysisItem.analysisCategory == 'energy') {
      this.methodsUndertakenLabel = 'Please describe any methods undertaken to normalize energy intensity data or adjust baseline data to account for economic and other factors that affect energy use:';
      this.modificationNotesLabel = 'Please describe the energy efficient technologies, strategies, and practices employed during the previous year to decrease intensity. Please identify systems impacted and approximate savings from projects. (Ex: Furnace insulation project-12,000 MMBtu/yr savings, compressor controls upgrade-6,000 MMBtu/yr, energy awareness campaign, etc):';
    }
    this.setBaselineYearWarning();
  }

  setBaselineYearWarning() {
    this.baselineYearWarning = undefined;
    if (this.selectedAnalysisItem && this.selectedAnalysisItem.analysisCategory == 'water') {
      if (this.selectedAnalysisItem.baselineYear && this.account.sustainabilityQuestions.waterReductionGoal && this.account.sustainabilityQuestions.waterReductionBaselineYear != this.selectedAnalysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your corporate baseline year."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else if (this.selectedAnalysisItem && this.selectedAnalysisItem.analysisCategory == 'energy') {
      if (this.selectedAnalysisItem.baselineYear && this.account.sustainabilityQuestions.energyReductionGoal && this.account.sustainabilityQuestions.energyReductionBaselineYear != this.selectedAnalysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your corporate baseline year."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else {
      this.baselineYearWarning = undefined;
    }
  }
}
