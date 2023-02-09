import { Component } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';

@Component({
  selector: 'app-create-report-modal',
  templateUrl: './create-report-modal.component.html',
  styleUrls: ['./create-report-modal.component.css']
})
export class CreateReportModalComponent {

  showModalSub: Subscription;
  showModal: boolean;
  accountReport: IdbAccountReport;
  isOverviewReport: boolean;
  showWater: boolean;
  constructor(private sharedDataService: SharedDataService, private router: Router,
    private accountReportDbService: AccountReportDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private accountOverviewService: AccountOverviewService,
    private toastNotificationService: ToastNotificationsService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService) {

  }

  ngOnInit() {
    this.showModalSub = this.sharedDataService.openCreateReportModal.subscribe(val => {
      if (val == true) {
        this.accountReport = this.getNewReport();
        this.setIsOverviewReport();
        if (this.isOverviewReport) {
          this.setShowWater();
        }
      }
      this.showModal = val;
    });
  }

  ngOnDestroy() {
    this.showModalSub.unsubscribe();
  }

  cancelCreateReport() {
    this.sharedDataService.openCreateReportModal.next(false);
  }

  async createReport() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let navigateToStr: string;
    if (this.router.url.includes('account/overview')) {
      navigateToStr = 'account/account-reports/data-overview-report';
    } else if (this.router.url.includes('facility') && this.router.url.includes('/overview')) {
      navigateToStr = 'account/account-reports/data-overview-report';
    } else if (this.router.url.includes('account/analysis')) {
      navigateToStr = 'account/account-reports/better-plants-report';
    }
    let addedReport: IdbAccountReport = await this.accountReportDbService.addWithObservable(this.accountReport).toPromise();
    await this.dbChangesService.setAccountReports(account);
    this.accountReportDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('Report Created', undefined, undefined, false, "bg-success");
    this.sharedDataService.openCreateReportModal.next(false);
    this.router.navigateByUrl(navigateToStr);
  }

  getNewReport(): IdbAccountReport {
    let newReport: IdbAccountReport = this.accountReportDbService.getNewAccountReport();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (this.router.url.includes('account/overview')) {
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
    } else if (this.router.url.includes('facility') && this.router.url.includes('/overview')) {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      newReport.reportType = 'dataOverview';
      let yearOptions: Array<number> = this.utilityMeterDataDbService.getYearOptions(false);
      newReport.baselineYear = yearOptions[0];
      newReport.reportYear = yearOptions[yearOptions.length - 1];
      newReport.dataOverviewReportSetup.includeAccountReport = false;
      newReport.dataOverviewReportSetup.includedFacilities.forEach(facility => {
        if (facility.facilityId == selectedFacility.guid) {
          facility.included = true;
        } else {
          facility.included = false;
        }
      });
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
    }
    return newReport;
  }

  setIsOverviewReport() {
    this.isOverviewReport = this.router.url.includes('overview');
  }

  setShowWater() {
    if (this.router.url.includes('account')) {
      let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
      let waterMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.source == 'Water' || meter.source == 'Waste Water' });
      this.showWater = waterMeter != undefined;
    } else if (this.router.url.includes('facility')) {
      let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
      let waterMeter: IdbUtilityMeter = facilityMeters.find(meter => { return meter.source == 'Water' || meter.source == 'Waste Water' });
      this.showWater = waterMeter != undefined;
    }
  }
}
