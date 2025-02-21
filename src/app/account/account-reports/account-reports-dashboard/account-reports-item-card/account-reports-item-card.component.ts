import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountReportsService } from '../../account-reports.service';
import { firstValueFrom } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
    selector: 'app-account-reports-item-card',
    templateUrl: './account-reports-item-card.component.html',
    styleUrls: ['./account-reports-item-card.component.css'],
    standalone: false
})
export class AccountReportsItemCardComponent {
  @Input()
  report: IdbAccountReport;


  displayDeleteModal: boolean;
  isValid: boolean;
  reportStartDate: Date;
  reportEndDate: Date;
  constructor(private accountReportDbService: AccountReportDbService,
    private router: Router,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private toastNotificationService: ToastNotificationsService,
    private accountReportsService: AccountReportsService) {

  }

  ngOnInit() {
    this.isValid = this.accountReportsService.isReportValid(this.report);
    if(this.report.reportType == 'dataOverview'){
      this.reportStartDate = this.getDate(this.report.startMonth, this.report.startYear);
      this.reportEndDate = this.getDate(this.report.endMonth, this.report.endYear);
    }

  }

  selectReport() {
    this.accountReportDbService.selectedReport.next(this.report);
    this.router.navigateByUrl('account/reports/setup');
  }

  async createCopy() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let newReport: IdbAccountReport = JSON.parse(JSON.stringify(this.report));
    delete newReport.id;
    newReport.name = newReport.name + ' (Copy)';
    newReport.guid = Math.random().toString(36).substr(2, 9);
    let addedReport: IdbAccountReport = await firstValueFrom(this.accountReportDbService.addWithObservable(newReport));
    await this.dbChangesService.setAccountReports(selectedAccount);
    this.accountReportDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('Report Copy Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('account/reports/setup');

  }

  deleteReport() {
    this.displayDeleteModal = true;
  }

  cancelDelete() {
    this.displayDeleteModal = false;
  }

  async confirmDelete() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await firstValueFrom(this.accountReportDbService.deleteWithObservable(this.report.id));
    await this.dbChangesService.setAccountReports(selectedAccount);
    this.displayDeleteModal = false;
    this.toastNotificationService.showToast('Report Deleted', undefined, undefined, false, "alert-success");
  }

  getDate(month: number, year: number): Date {
    return new Date(year, month, 1);
  }
}
