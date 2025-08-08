import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountReportsService } from '../../account-reports.service';
import { AccountSavingsReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-account-savings-report-setup',
  standalone: false,

  templateUrl: './account-savings-report-setup.component.html',
  styleUrl: './account-savings-report-setup.component.css'
})
export class AccountSavingsReportSetupComponent {
  accountSavingsReportForm: FormGroup;
  account: IdbAccount;
  analysisOptions: Array<IdbAccountAnalysisItem>
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  reportSetup: AccountSavingsReportSetup;
  numberOfPerformerOptions: Array<number> = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
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
        this.accountSavingsReportForm = this.accountReportsService.getAccountSavingsFormFromReport(val.accountSavingsReportSetup);
        this.reportSetup = val.accountSavingsReportSetup;
        this.setAnalysisOptions();
      } else {
        this.isFormChange = false;
      }
    });
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
  }

  async save() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    selectedReport.accountSavingsReportSetup = this.accountReportsService.updateAccountSavingsReportFromForm(selectedReport.accountSavingsReportSetup, this.accountSavingsReportForm);
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  setAnalysisOptions() {
    this.analysisOptions = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.setSelectedAnalysisItem(true);
    if (!this.selectedAnalysisItem) {
      this.accountSavingsReportForm.controls.analysisItemId.patchValue(undefined);
      this.accountSavingsReportForm.controls.analysisItemId.updateValueAndValidity();
      this.save();
    }
  }

  async setSelectedAnalysisItem(onInit: boolean) {
    this.selectedAnalysisItem = this.analysisOptions.find(item => { return item.guid == this.accountSavingsReportForm.controls.analysisItemId.value });

    if (!onInit) {
      await this.save();
    }
  }
}


