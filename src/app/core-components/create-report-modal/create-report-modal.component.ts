import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountOverviewService } from 'src/app/data-evaluation/account/account-overview/account-overview.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { FacilityOverviewService } from 'src/app/data-evaluation/facility/facility-overview/facility-overview.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { getNewIdbAccountReport, IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
    selector: 'app-create-report-modal',
    templateUrl: './create-report-modal.component.html',
    styleUrls: ['./create-report-modal.component.css'],
    standalone: false
})
export class CreateReportModalComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  showModalSub: Subscription;
  showModal: boolean;
  accountReport: IdbAccountReport;
  isOverviewReport: boolean;
  showWater: boolean;
  inAccount: boolean;
  account: IdbAccount;
  accountSub: Subscription;
  constructor(
    private sharedDataService: SharedDataService,
    private router: Router,
    private accountReportDbService: AccountReportDbService,
    private accountOverviewService: AccountOverviewService,
    private toastNotificationService: ToastNotificationsService,
    private facilityOverviewService: FacilityOverviewService
  ) {

  }

  ngOnInit() {
    this.accountSub = toObservable(this.accountWorkspaceStore.account).subscribe(account => {
      this.account = account;
    });
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
    this.accountSub.unsubscribe();
  }

  cancelCreateReport() {
    this.sharedDataService.openCreateReportModal.next(false);
  }

  async createReport() {
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let navigateToStr: string;
    if (this.router.url.includes('account/overview')) {
      navigateToStr = '/data-evaluation/account/reports/data-overview-report';
    } else if (this.router.url.includes('facility') && this.router.url.includes('/overview')) {
      navigateToStr = '/data-evaluation/account/reports/data-overview-report';
    } else if (this.router.url.includes('account/analysis')) {
      navigateToStr = '/data-evaluation/account/reports/better-plants-report';
    }
    let addedReport: IdbAccountReport = await firstValueFrom(this.accountReportDbService.addWithObservable(this.accountReport));
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.accountWorkspaceService.selectAccountReport((addedReport)?.guid);
    this.toastNotificationService.showToast('Report Created', undefined, undefined, false, "alert-success");
    this.sharedDataService.openCreateReportModal.next(false);
    this.router.navigateByUrl(navigateToStr);
  }

  getNewReport(): IdbAccountReport {
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let facilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
    let groups: Array<IdbUtilityMeterGroup> = [...this.accountWorkspaceStore.meterGroups()];
    let newReport: IdbAccountReport = getNewIdbAccountReport(account, facilities, groups);
    if (this.router.url.includes('account/overview')) {
      newReport.reportType = 'dataOverview';
      let dateRange: { startDate: Date, endDate: Date } = this.accountOverviewService.dateRange.getValue();
      newReport.startMonth = dateRange.startDate.getMonth();
      newReport.startYear = dateRange.startDate.getFullYear();
      newReport.endMonth = dateRange.endDate.getMonth();
      newReport.endYear = dateRange.endDate.getFullYear();
      newReport.dataOverviewReportSetup.includeFacilityReports = false;
      if (this.router.url.includes('energy')) {
        newReport.name = account.name + ' Energy Report';
        newReport.dataOverviewReportSetup.includeCostsSection = false;
        newReport.dataOverviewReportSetup.includeEmissionsSection = false;
        newReport.dataOverviewReportSetup.includeWaterSection = false;
      } else if (this.router.url.includes('costs')) {
        newReport.name = account.name + ' Costs Report';
        newReport.dataOverviewReportSetup.includeEnergySection = false;
        newReport.dataOverviewReportSetup.includeEmissionsSection = false;
        newReport.dataOverviewReportSetup.includeWaterSection = false;
      } else if (this.router.url.includes('emissions')) {
        newReport.name = account.name + ' Emissions Report';
        newReport.dataOverviewReportSetup.includeEnergySection = false;
        newReport.dataOverviewReportSetup.includeCostsSection = false;
        newReport.dataOverviewReportSetup.includeWaterSection = false;
        newReport.dataOverviewReportSetup.emissionsDisplay = this.accountOverviewService.emissionsDisplay.getValue();
      } else if (this.router.url.includes('water')) {
        newReport.name = account.name + ' Water Report';
        newReport.dataOverviewReportSetup.includeEnergySection = false;
        newReport.dataOverviewReportSetup.includeCostsSection = false;
        newReport.dataOverviewReportSetup.includeEmissionsSection = false;
      }
    } else if (this.router.url.includes('facility') && this.router.url.includes('/overview')) {
      let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
      newReport.reportType = 'dataOverview';
      let dateRange: { startDate: Date, endDate: Date } = this.facilityOverviewService.dateRange.getValue();
      newReport.startMonth = dateRange.startDate.getMonth();
      newReport.startYear = dateRange.startDate.getFullYear();
      newReport.endMonth = dateRange.endDate.getMonth();
      newReport.endYear = dateRange.endDate.getFullYear();

      newReport.dataOverviewReportSetup.includeAccountReport = false;
      newReport.dataOverviewReportSetup.includedFacilities.forEach(facility => {
        if (facility.facilityId == selectedFacility.guid) {
          facility.included = true;
        } else {
          facility.included = false;
        }
      });
      if (this.router.url.includes('energy')) {
        newReport.name = selectedFacility.name + ' Energy Report';
        newReport.dataOverviewReportSetup.includeCostsSection = false;
        newReport.dataOverviewReportSetup.includeEmissionsSection = false;
        newReport.dataOverviewReportSetup.includeWaterSection = false;
      } else if (this.router.url.includes('costs')) {
        newReport.name = selectedFacility.name + ' Costs Report';
        newReport.dataOverviewReportSetup.includeEnergySection = false;
        newReport.dataOverviewReportSetup.includeEmissionsSection = false;
        newReport.dataOverviewReportSetup.includeWaterSection = false;
      } else if (this.router.url.includes('emissions')) {
        newReport.name = selectedFacility.name + ' Emissions Report';
        newReport.dataOverviewReportSetup.includeEnergySection = false;
        newReport.dataOverviewReportSetup.includeCostsSection = false;
        newReport.dataOverviewReportSetup.includeWaterSection = false;
        newReport.dataOverviewReportSetup.emissionsDisplay = this.facilityOverviewService.emissionsDisplay.getValue();
      } else if (this.router.url.includes('water')) {
        newReport.name = selectedFacility.name + ' Water Report';
        newReport.dataOverviewReportSetup.includeEnergySection = false;
        newReport.dataOverviewReportSetup.includeCostsSection = false;
        newReport.dataOverviewReportSetup.includeEmissionsSection = false;
      }
    } else if (this.router.url.includes('account/analysis')) {
      let selectedAnalysisItem: IdbAccountAnalysisItem = this.accountWorkspaceStore.selectedAccountAnalysis();
      newReport.name = 'Better Plants Report';
      newReport.reportType = 'betterPlants';
      newReport.baselineYear = account.sustainabilityQuestions.energyReductionBaselineYear;
      // TODO: set report year to latest year of data
      // newReport.reportYear = selectedAnalysisItem.reportYear;
      newReport.betterPlantsReportSetup.analysisItemId = selectedAnalysisItem.guid;
    }
    return newReport;
  }

  setIsOverviewReport() {
    this.isOverviewReport = this.router.url.includes('overview');
    this.inAccount = this.router.url.includes('account');
  }

  setShowWater() {
    if (this.router.url.includes('account')) {
      let accountMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];
      let waterMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.source == 'Water Intake' || meter.source == 'Water Discharge' });
      this.showWater = waterMeter != undefined;
    } else if (this.router.url.includes('facility')) {
      let facilityMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
      let waterMeter: IdbUtilityMeter = facilityMeters.find(meter => { return meter.source == 'Water Intake' || meter.source == 'Water Discharge' });
      this.showWater = waterMeter != undefined;
    }
  }
}
