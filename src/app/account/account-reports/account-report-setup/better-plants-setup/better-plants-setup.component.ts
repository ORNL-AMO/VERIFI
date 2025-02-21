import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountReportsService } from '../../account-reports.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

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
  accountAnalysisItems: Array<IdbAccountAnalysisItem>;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  itemToEdit: IdbAccountAnalysisItem;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router) {
  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      if (!this.isFormChange) {
        this.betterPlantsReportForm = this.accountReportsService.getBetterPlantsFormFromReport(val.betterPlantsReportSetup);
        this.setAnalysisOptions(val);
      } else {
        this.isFormChange = false;
      }
    })
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
  }

  async save() {
    this.isFormChange = true;
    this.setSelectedAnalysisItem();
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport.betterPlantsReportSetup = this.accountReportsService.updateBetterPlantsReportFromForm(selectedReport.betterPlantsReportSetup, this.betterPlantsReportForm);
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  setAnalysisOptions(report: IdbAccountReport) {
    let analysisOptions: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.accountAnalysisItems = analysisOptions.filter(option => { return option.reportYear == report.reportYear && option.energyIsSource });
    this.setSelectedAnalysisItem();
    if (!this.selectedAnalysisItem) {
      this.betterPlantsReportForm.controls.analysisItemId.patchValue(undefined);
      this.betterPlantsReportForm.controls.analysisItemId.updateValueAndValidity();
      this.save();
    }
  }

  viewAnalysis(analysisItem: IdbAccountAnalysisItem) {
    this.itemToEdit = analysisItem;
  }

  confirmEditItem() {
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.itemToEdit);
    this.router.navigateByUrl('account/analysis/results/annual-analysis');
  }

  cancelEditItem() {
    this.itemToEdit = undefined;
  }

  setSelectedAnalysisItem() {
    this.selectedAnalysisItem = this.accountAnalysisItems.find(item => { return item.guid == this.betterPlantsReportForm.controls.analysisItemId.value });
    if (this.selectedAnalysisItem && this.selectedAnalysisItem.analysisCategory == 'water') {
      this.methodsUndertakenLabel = 'If a baseline adjustment was made, please indicate the reason for making the adjustment';
      this.modificationNotesLabel = 'Please briefly describe major technologies, strategies, and practices employed during the previous year to decrease water intensity. Please identify: systems/processes impacted, approximate water savings from projects, and implementation cost';
    } else {
      this.methodsUndertakenLabel = 'Please describe any methods undertaken to normalize energy intensity data or adjust baseline data to account for economic and other factors that affect energy use:';
      this.modificationNotesLabel = 'Please describe the energy efficient technologies, strategies, and practices employed during the previous year to decrease intensity. Please identify systems impacted and approximate savings from projects. (Ex: Furnace insulation project-12,000 MMBtu/yr savings, compressor controls upgrade-6,000 MMBtu/yr, energy awareness campaign, etc):';
    }
  }
}
