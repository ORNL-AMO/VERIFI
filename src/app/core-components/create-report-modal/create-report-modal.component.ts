import { Component } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport } from 'src/app/models/idb';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';

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
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private accountAnalysisDbService: AccountAnalysisDbService) {

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
    let navigateToStr: string;
    if (this.router.url.includes('account/overview')) {
      navigateToStr = 'account/account-reports/data-overview-report';
      newReport.reportType = 'dataOverview';
      let yearOptions: Array<number> = this.utilityMeterDataDbService.getYearOptions(true);
      newReport.baselineYear = yearOptions[0];
      newReport.reportYear = yearOptions[yearOptions.length - 1];
      if (this.router.url.includes('energy')) {
        newReport.name = 'Energy Report';
        newReport.dataOverviewReportSetup.includeCostsSection = false;
        newReport.dataOverviewReportSetup.includeEmissionsSection = false;
        newReport.dataOverviewReportSetup.includeWaterSection = false;
      } else if (this.router.url.includes('costs')) {
        newReport.name = 'Costs Report';
        newReport.dataOverviewReportSetup.includeEnergySection = false;
        newReport.dataOverviewReportSetup.includeEmissionsSection = false;
        newReport.dataOverviewReportSetup.includeWaterSection = false;
      } else if (this.router.url.includes('emissions')) {
        newReport.name = 'Emissions Report';
        newReport.dataOverviewReportSetup.includeEnergySection = false;
        newReport.dataOverviewReportSetup.includeCostsSection = false;
        newReport.dataOverviewReportSetup.includeWaterSection = false;
        newReport.dataOverviewReportSetup.emissionsDisplay = this.accountOverviewService.emissionsDisplay.getValue();
      } else if (this.router.url.includes('water')) {
        newReport.name = 'Water Report';
        newReport.dataOverviewReportSetup.includeEnergySection = false;
        newReport.dataOverviewReportSetup.includeCostsSection = false;
        newReport.dataOverviewReportSetup.includeEmissionsSection = false;
      }
    } else if (this.router.url.includes('account/analysis')) {
      let selectedAnalysisItem: IdbAccountAnalysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
      newReport.name = 'Better Plants Report';
      newReport.reportType = 'betterPlants';
      newReport.baselineYear = account.sustainabilityQuestions.energyReductionBaselineYear;
      newReport.reportYear = selectedAnalysisItem.reportYear;
      newReport.betterPlantsReportSetup.analysisItemId = selectedAnalysisItem.guid;
      navigateToStr = 'account/account-reports/better-plants-report';
    }
    let addedReport: IdbAccountReport = await this.accountReportDbService.addWithObservable(newReport).toPromise();
    await this.dbChangesService.setAccountReports(account);
    this.accountReportDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('Report Created', undefined, undefined, false, "bg-success");
    this.sharedDataService.openCreateReportModal.next(false);
    this.router.navigateByUrl(navigateToStr);
  }
}
