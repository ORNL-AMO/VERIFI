import { Component } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

@Component({
  selector: 'app-create-report-modal',
  templateUrl: './create-report-modal.component.html',
  styleUrls: ['./create-report-modal.component.css']
})
export class CreateReportModalComponent {

  showModalSub: Subscription;
  showModal: boolean;
  constructor(private sharedDataService: SharedDataService, private router: Router,
    private accountReportDbService: AccountReportDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private accountOverviewService: AccountOverviewService,
    private toastNotificationService: ToastNotificationsService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) {

  }

  ngOnInit() {
    this.showModalSub = this.sharedDataService.openCreateReportModal.subscribe(val => {
      this.showModal = val;
    });
  }

  cancelCreateReport() {
    this.sharedDataService.openCreateReportModal.next(false);
  }

  async createReport() {
    let newReport: IdbAccountReport = this.accountReportDbService.getNewAccountReport();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (this.router.url.includes('account/overview')) {
      newReport.reportType = 'dataOverview';
      let yearOptions: Array<number> = this.utilityMeterDataDbService.getYearOptions(true);
      newReport.baselineYear = yearOptions[0];
      newReport.reportYear = yearOptions[yearOptions.length - 1];
      if (this.router.url.includes('energy')) {
        newReport.name = account.name + ' Energy Report';
        newReport.dataOverviewReportSetup.accountCostsSection.includeSection = false;
        newReport.dataOverviewReportSetup.accountEmissionsSection.includeSection = false;
        newReport.dataOverviewReportSetup.accountWaterSection.includeSection = false;
      } else if (this.router.url.includes('costs')) {
        newReport.name = account.name + ' Costs Report';
        newReport.dataOverviewReportSetup.accountEmissionsSection.includeSection = false;
        newReport.dataOverviewReportSetup.accountEnergySection.includeSection = false;
        newReport.dataOverviewReportSetup.accountWaterSection.includeSection = false;
      } else if (this.router.url.includes('emissions')) {
        newReport.name = account.name + ' Emissions Report';
        newReport.dataOverviewReportSetup.accountCostsSection.includeSection = false;
        newReport.dataOverviewReportSetup.accountEnergySection.includeSection = false;
        newReport.dataOverviewReportSetup.accountWaterSection.includeSection = false;
        newReport.dataOverviewReportSetup.emissionsDisplay = this.accountOverviewService.emissionsDisplay.getValue();
      } else if (this.router.url.includes('water')) {
        newReport.name = account.name + ' Water Report';
        newReport.dataOverviewReportSetup.accountCostsSection.includeSection = false;
        newReport.dataOverviewReportSetup.accountEnergySection.includeSection = false;
        newReport.dataOverviewReportSetup.accountEmissionsSection.includeSection = false;
      }
    }
    let addedReport: IdbAccountReport = await this.accountReportDbService.addWithObservable(newReport).toPromise();
    await this.dbChangesService.setAccountReports(account);
    this.accountReportDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('Report Created', undefined, undefined, false, "bg-success");
    this.sharedDataService.openCreateReportModal.next(false);
    this.router.navigateByUrl('account/account-reports/data-overview-report');
  }
}
