import { Component } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountReportsService } from '../account-reports.service';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import { firstValueFrom } from 'rxjs';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
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
  months: Array<Month> = Months;
  //TODO: Report years validation. Start < End (issue-1194)
  reportType: 'Better Plants' | 'Data Overview' | 'Performance';
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private calanderizationService: CalanderizationService) {

  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    if(selectedReport.reportType == 'betterPlants'){
      this.reportType = 'Better Plants';
    }else if(selectedReport.reportType == 'dataOverview'){
      this.reportType = 'Data Overview';
    }else if(selectedReport.reportType == 'performance'){
      this.reportType = 'Performance';
    }
    this.setupForm = this.accountReportsService.getSetupFormFromReport(selectedReport);
    this.setYearOptions();
  }

  async save() {
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport = this.accountReportsService.updateReportFromSetupForm(selectedReport, this.setupForm);
    await firstValueFrom(this.accountReportDbService.updateWithObservable(selectedReport));
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

  async changeReportType() {
    if (this.setupForm.controls.reportType.value == 'betterPlants' || this.setupForm.controls.reportType.value == 'performance') {
      this.setupForm.controls.baselineYear.setValidators([Validators.required]);
      this.setupForm.controls.reportYear.setValidators([Validators.required]);
      this.setupForm.controls.startYear.clearValidators();
      this.setupForm.controls.startMonth.clearValidators();
      this.setupForm.controls.endYear.clearValidators();
      this.setupForm.controls.endMonth.clearValidators();
    } else if (this.setupForm.controls.reportType.value == 'dataOverview') {
      this.setupForm.controls.baselineYear.clearValidators();
      this.setupForm.controls.reportYear.clearValidators();
      this.setupForm.controls.startYear.setValidators([Validators.required]);
      this.setupForm.controls.startMonth.setValidators([Validators.required]);
      this.setupForm.controls.endYear.setValidators([Validators.required]);
      this.setupForm.controls.endMonth.setValidators([Validators.required]);
    }
    this.setupForm.controls.baselineYear.updateValueAndValidity();
    this.setupForm.controls.reportYear.updateValueAndValidity();
    this.setupForm.controls.startYear.updateValueAndValidity();
    this.setupForm.controls.startMonth.updateValueAndValidity();
    this.setupForm.controls.endYear.updateValueAndValidity();
    this.setupForm.controls.endMonth.updateValueAndValidity();
    this.setupForm.updateValueAndValidity();
    await this.save();
  }

}
