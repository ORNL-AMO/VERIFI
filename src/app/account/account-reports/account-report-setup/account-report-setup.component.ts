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
import { ReportType } from 'src/app/models/constantsAndTypes';
import { AccountOverviewService } from '../../account-overview/account-overview.service';
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
  //TODO: Report years validation. Start < End (issue-1194)
  reportType: ReportType;
  dateRangeSub: Subscription;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  errorMessage: string = '';
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private calanderizationService: CalanderizationService,
    private accountOverviewService: AccountOverviewService) {

  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    this.reportType = selectedReport.reportType;
    this.accountReportsService.setErrorMessage(this.errorMessage);
    this.setupForm = this.accountReportsService.getSetupFormFromReport(selectedReport);
    this.setYearOptions();

    this.dateRangeSub = this.accountOverviewService.dateRange.subscribe(dateRange => {
      if (dateRange) {
        this.startMonth = this.setupForm.get('startMonth').value;
        this.startYear = this.setupForm.get('startYear').value;
        this.endMonth = this.setupForm.get('endMonth').value;
        this.endYear = this.setupForm.get('endYear').value;
      }
    });

    // on browser reload
    if (this.setupForm.get('startYear').value !== null && this.setupForm.get('startMonth').value !== null && this.setupForm.get('endYear').value !== null
      && this.setupForm.get('endMonth').value !== null) {
      this.validateDate();
    }
  }

  ngOnDestroy() {
    this.dateRangeSub.unsubscribe();
  }

  validateDate() {

    let startDate: Date = new Date(this.setupForm.get('startYear').value, this.setupForm.get('startMonth').value, 1);
    let endDate: Date = new Date(this.setupForm.get('endYear').value, this.setupForm.get('endMonth').value, 1);

    // compare start and end date
    if (startDate.getTime() >= endDate.getTime()) {
      this.errorMessage = 'Start date cannot be later than the end date';
      this.accountReportsService.setErrorMessage(this.errorMessage); // setting the message in the local storage
      return;
    }

    this.errorMessage = '';
    this.accountReportsService.setErrorMessage(this.errorMessage); // setting the message in the local storage

    // Proceed with valid date range
    this.accountOverviewService.dateRange.next({
      startDate: startDate,
      endDate: endDate
    });
  }

  async save() {

    // if all the date fields are filled, validate the date
    if (this.setupForm.get('startYear').value !== null && this.setupForm.get('startMonth').value !== null && this.setupForm.get('endYear').value !== null
      && this.setupForm.get('endMonth').value !== null) {
      this.validateDate();
    }
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    selectedReport = this.accountReportsService.updateReportFromSetupForm(selectedReport, this.setupForm);
    selectedReport = await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  setYearOptions() {
    //TODO: baseline years less than report year selection
    //TODO: report years greater than baseline year selection
    //TODO: get options by water/energy
    let yearOptions: Array<number> = this.calanderizationService.getYearOptionsAccount('all');
    this.reportYears = yearOptions;
    this.baselineYears = yearOptions;
  }

}
