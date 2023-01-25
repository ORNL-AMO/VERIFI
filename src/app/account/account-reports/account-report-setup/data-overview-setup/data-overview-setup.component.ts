import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { AccountReportsService } from '../../account-reports.service';

@Component({
  selector: 'app-data-overview-setup',
  templateUrl: './data-overview-setup.component.html',
  styleUrls: ['./data-overview-setup.component.css']
})
export class DataOverviewSetupComponent {

  overviewForm: FormGroup;
  account: IdbAccount;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  accountEnergySectionForm: FormGroup;
  accountCostsSectionForm: FormGroup;
  accountEmissionsSectionForm: FormGroup;
  accountWaterSectionForm: FormGroup;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService) {
  }


  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      if (!this.isFormChange) {
        this.overviewForm = this.accountReportsService.getDataOverviewFormFromReport(val.dataOverviewReportSetup);
        this.accountEnergySectionForm = this.accountReportsService.getSectionFormFromReport(val.dataOverviewReportSetup.accountEnergySection);
        this.accountCostsSectionForm = this.accountReportsService.getSectionFormFromReport(val.dataOverviewReportSetup.accountCostsSection);
        this.accountEmissionsSectionForm = this.accountReportsService.getSectionFormFromReport(val.dataOverviewReportSetup.accountEmissionsSection);
        this.accountWaterSectionForm = this.accountReportsService.getSectionFormFromReport(val.dataOverviewReportSetup.accountWaterSection);
      } else {
        this.isFormChange = false;
      }
    })
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
  }

  async saveGeneralInformation() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport.dataOverviewReportSetup = this.accountReportsService.updateDataOverviewReportFromForm(selectedReport.dataOverviewReportSetup, this.overviewForm);
    await this.accountReportDbService.updateWithObservable(selectedReport).toPromise();
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  async saveEnergySection() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport.dataOverviewReportSetup.accountEnergySection = this.accountReportsService.updateReportSectionFromForm(selectedReport.dataOverviewReportSetup.accountEnergySection, this.accountEnergySectionForm);
    await this.accountReportDbService.updateWithObservable(selectedReport).toPromise();
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  async saveCostsSection() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport.dataOverviewReportSetup.accountCostsSection = this.accountReportsService.updateReportSectionFromForm(selectedReport.dataOverviewReportSetup.accountCostsSection, this.accountCostsSectionForm);
    await this.accountReportDbService.updateWithObservable(selectedReport).toPromise();
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  async saveEmissionsSection() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport.dataOverviewReportSetup.accountEmissionsSection = this.accountReportsService.updateReportSectionFromForm(selectedReport.dataOverviewReportSetup.accountEmissionsSection, this.accountEmissionsSectionForm);
    await this.accountReportDbService.updateWithObservable(selectedReport).toPromise();
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  async saveWaterSection() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport.dataOverviewReportSetup.accountWaterSection = this.accountReportsService.updateReportSectionFromForm(selectedReport.dataOverviewReportSetup.accountWaterSection, this.accountWaterSectionForm);
    await this.accountReportDbService.updateWithObservable(selectedReport).toPromise();
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }
}
