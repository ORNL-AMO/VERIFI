import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { AccountReportsService } from '../../../account-reports.service';

@Component({
  selector: 'app-account-section-form',
  templateUrl: './account-section-form.component.html',
  styleUrls: ['./account-section-form.component.css']
})
export class AccountSectionFormComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';

  account: IdbAccount;
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  sectionForm: FormGroup;
  dataTypeLabel: string;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService) {
  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.selectedReportSub = this.accountReportDbService.selectedReport.subscribe(val => {
      if (!this.isFormChange) {
        if (this.dataType == 'cost') {
          this.sectionForm = this.accountReportsService.getSectionFormFromReport(val.dataOverviewReportSetup.accountCostsSection);
          this.dataTypeLabel = 'Costs';
        } else if (this.dataType == 'energyUse') {
          this.sectionForm = this.accountReportsService.getSectionFormFromReport(val.dataOverviewReportSetup.accountEnergySection);
          this.dataTypeLabel = 'Energy Usage';
        } else if (this.dataType == 'emissions') {
          this.sectionForm = this.accountReportsService.getSectionFormFromReport(val.dataOverviewReportSetup.accountEmissionsSection);
          this.dataTypeLabel = 'Emissions';
        } else if (this.dataType == 'water') {
          this.sectionForm = this.accountReportsService.getSectionFormFromReport(val.dataOverviewReportSetup.accountWaterSection);
          this.dataTypeLabel = 'Water Consumption';
        }
      } else {
        this.isFormChange = false;
      }
    })
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
  }

  async save() {
    if (this.dataType == 'cost') {
      this.saveCostsSection();
    } else if (this.dataType == 'energyUse') {
      this.saveEnergySection();
    } else if (this.dataType == 'emissions') {
      this.saveEmissionsSection();
    } else if (this.dataType == 'water') {
      this.saveWaterSection();
    }
  }

  async saveEnergySection() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport.dataOverviewReportSetup.accountEnergySection = this.accountReportsService.updateReportSectionFromForm(selectedReport.dataOverviewReportSetup.accountEnergySection, this.sectionForm);
    await this.accountReportDbService.updateWithObservable(selectedReport).toPromise();
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  async saveCostsSection() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport.dataOverviewReportSetup.accountCostsSection = this.accountReportsService.updateReportSectionFromForm(selectedReport.dataOverviewReportSetup.accountCostsSection, this.sectionForm);
    await this.accountReportDbService.updateWithObservable(selectedReport).toPromise();
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  async saveEmissionsSection() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport.dataOverviewReportSetup.accountEmissionsSection = this.accountReportsService.updateReportSectionFromForm(selectedReport.dataOverviewReportSetup.accountEmissionsSection, this.sectionForm);
    await this.accountReportDbService.updateWithObservable(selectedReport).toPromise();
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }

  async saveWaterSection() {
    this.isFormChange = true;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue()
    selectedReport.dataOverviewReportSetup.accountWaterSection = this.accountReportsService.updateReportSectionFromForm(selectedReport.dataOverviewReportSetup.accountWaterSection, this.sectionForm);
    await this.accountReportDbService.updateWithObservable(selectedReport).toPromise();
    await this.dbChangesService.setAccountReports(this.account);
    this.accountReportDbService.selectedReport.next(selectedReport);
  }
}
