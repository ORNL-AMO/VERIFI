import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountReportsService } from '../../account-reports.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { Router } from '@angular/router';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
    selector: 'app-performance-setup',
    templateUrl: './performance-setup.component.html',
    styleUrls: ['./performance-setup.component.css'],
    standalone: false
})
export class PerformanceSetupComponent {


  performanceReportForm: FormGroup;
  account: IdbAccount;
  accountAnalysisItems: Array<IdbAccountAnalysisItem>;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  itemToEdit: IdbAccountAnalysisItem;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  numberOfPerformerOptions: Array<number> = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
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
        this.performanceReportForm = this.accountReportsService.getPerformanceFormFromReport(val.performanceReportSetup);
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
    selectedReport.performanceReportSetup = this.accountReportsService.updatePerformanceReportSetupFromForm(selectedReport.performanceReportSetup, this.performanceReportForm);
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  setAnalysisOptions(report: IdbAccountReport) {
    let analysisOptions: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.accountAnalysisItems = analysisOptions.filter(option => { return option.reportYear == report.reportYear });
    this.setSelectedAnalysisItem();
    if (!this.selectedAnalysisItem) {
      this.performanceReportForm.controls.analysisItemId.patchValue(undefined);
      this.performanceReportForm.controls.analysisItemId.updateValueAndValidity();
      this.save();
    }
  }

  viewAnalysis(analysisItem: IdbAccountAnalysisItem) {
    this.itemToEdit = analysisItem;
  }

  confirmEditItem() {
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.itemToEdit);
    this.router.navigateByUrl('/data-evaluation/account/analysis/results/annual-analysis');
  }

  cancelEditItem() {
    this.itemToEdit = undefined;
  }


  setSelectedAnalysisItem() {
    this.selectedAnalysisItem = this.accountAnalysisItems.find(item => { return item.guid == this.performanceReportForm.controls.analysisItemId.value });
  }
}
