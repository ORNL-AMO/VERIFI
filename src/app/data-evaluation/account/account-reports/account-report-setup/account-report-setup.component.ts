import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountReportsService } from '../account-reports.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import { firstValueFrom, Subscription } from 'rxjs';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
  selector: 'app-account-report-setup',
  templateUrl: './account-report-setup.component.html',
  styleUrls: ['./account-report-setup.component.css'],
  standalone: false
})
export class AccountReportSetupComponent {

  setupForm: FormGroup;
  account: IdbAccount;
  reportYears: Array<number>;
  baselineYears: Array<number>;
  months: Array<Month> = Months;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  showReportYearWarning: boolean = false;
  selectedReport: IdbAccountReport;

  calanderizedMeterSub: Subscription;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private calanderizationService: CalanderizationService
  ) {

  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      this.selectedReport = val;
      if (!this.isFormChange) {
        this.setupForm = this.accountReportsService.getSetupFormFromReport(this.selectedReport);
      }
      else {
        this.isFormChange = false;
      }
    });

    this.calanderizedMeterSub = this.calanderizationService.calanderizedMeters.subscribe(val => {
      this.setYearOptions();
      this.checkReportYear();
    });
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
    this.calanderizedMeterSub.unsubscribe();
  }

  async save() {
    this.isFormChange = true;
    this.selectedReport = this.accountReportsService.updateReportFromSetupForm(this.selectedReport, this.setupForm);
    this.selectedReport = await firstValueFrom(this.accountReportDbService.updateWithObservable(this.selectedReport));
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(this.selectedReport);
    this.checkReportYear();
  }

  setYearOptions() {
    let yearOptions: Array<number> = this.calanderizationService.getYearOptions('all', true);
    this.reportYears = yearOptions;
    this.baselineYears = yearOptions;
  }

  checkReportYear() {
    if (this.selectedReport.reportType == 'analysis' && this.setupForm.controls.reportYear.value != undefined) {
      this.showReportYearWarning = this.calanderizationService.checkReportYearSelection('all', this.setupForm.controls.reportYear.value, true);
    }
  }
}
