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
  reportType: ReportType;
  errorMessage: string = '';
  errorMessageSub: Subscription;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private calanderizationService: CalanderizationService) {

  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    this.reportType = selectedReport.reportType;
    this.setYearOptions();

    this.errorMessageSub = this.accountReportsService.errorMessage.subscribe(message => {
      this.errorMessage = message;
    });

    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      selectedReport = val;
      if (!this.isFormChange)
        this.setupForm = this.accountReportsService.getSetupFormFromReport(selectedReport);
      else
        this.isFormChange = false;
    });
  }

  ngOnDestroy() {
    this.errorMessageSub.unsubscribe();
    this.selectedReportSub.unsubscribe();
  }

  async save() {
    this.isFormChange = true;
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
