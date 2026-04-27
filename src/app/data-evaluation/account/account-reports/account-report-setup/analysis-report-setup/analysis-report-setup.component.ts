import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { AccountReportsService } from '../../account-reports.service';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';

@Component({
  selector: 'app-analysis-report-setup',
  standalone: false,
  templateUrl: './analysis-report-setup.component.html',
  styleUrl: './analysis-report-setup.component.css'
})
export class AnalysisReportSetupComponent {
  analysisReportForm: FormGroup;
  account: IdbAccount;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  selectedAnalysisItem: IdbAccountAnalysisItem;
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
        this.analysisReportForm = this.accountReportsService.getAnalysisFormFromReport(val.analysisReportSetup);
        this.setSelectedAnalysisItem();
        this.subscribeAnalysisItemChanges();
      } else {
        this.isFormChange = false;
      }
    });
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
    this.analysisItemIdSub.unsubscribe();
  }

  subscribeAnalysisItemChanges() {
    if (this.analysisItemIdSub) {
      this.analysisItemIdSub.unsubscribe();
    }
    
    this.analysisItemIdSub = this.analysisReportForm.controls.analysisItemId.valueChanges.subscribe(async val => {
      await this.save();
    })
  }

  async save() {
    this.isFormChange = true;
    this.setSelectedAnalysisItem();

    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    selectedReport.analysisReportSetup = this.accountReportsService.updateAnalysisReportFromForm(selectedReport.analysisReportSetup, this.analysisReportForm);
    if (this.selectedAnalysisItem) {
      selectedReport.baselineYear = this.selectedAnalysisItem.baselineYear;
    }
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next({ ...selectedReport });
  }

  setSelectedAnalysisItem() {
    this.selectedAnalysisItem = this.accountAnalysisDbService.getByGuid(this.analysisReportForm.controls.analysisItemId.value);
  }

}


