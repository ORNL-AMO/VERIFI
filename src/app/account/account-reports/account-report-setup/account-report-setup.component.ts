import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountReportsService } from '../account-reports.service';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
@Component({
  selector: 'app-account-report-setup',
  templateUrl: './account-report-setup.component.html',
  styleUrls: ['./account-report-setup.component.css']
})
export class AccountReportSetupComponent {

  setupForm: FormGroup;
  account: IdbAccount;
  reportYears: Array<number>;
  baselineYears: Array<number>;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) {

  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    this.setupForm = this.accountReportsService.getSetupFormFromReport(selectedReport);
    this.setYearOptions();
  }

  async save() {
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport = this.accountReportsService.updateReportFromSetupForm(selectedReport, this.setupForm);
    await this.accountReportDbService.updateWithObservable(selectedReport).toPromise();
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  setYearOptions() {
    this.reportYears = this.utilityMeterDataDbService.getYearOptions(true);
    this.baselineYears = this.utilityMeterDataDbService.getYearOptions(true);
  }
}
