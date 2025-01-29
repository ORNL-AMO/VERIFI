import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import { EnergyUnitOptions, UnitOption, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { firstValueFrom } from 'rxjs';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountAnalysisService } from '../account-analysis.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisType } from 'src/app/models/analysis';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';

@Component({
    selector: 'app-account-analysis-setup',
    templateUrl: './account-analysis-setup.component.html',
    styleUrls: ['./account-analysis-setup.component.css'],
    standalone: false
})
export class AccountAnalysisSetupComponent implements OnInit {

  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  waterUnitOptions: Array<UnitOption> = VolumeLiquidOptions;
  months: Array<Month> = Months;

  account: IdbAccount;
  energyUnit: string;
  analysisItem: IdbAccountAnalysisItem;
  yearOptions: Array<number>;
  baselineYearWarning: string;
  disableForm: boolean;
  showInUseMessage: boolean;
  displayEnableForm: boolean = false;
  displayBulkAnalysisModal: boolean = false;
  analysisType: AnalysisType = 'absoluteEnergyConsumption';
  constructor(private accountDbService: AccountdbService, private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private dbChangesService: DbChangesService,
    private analysisDbService: AnalysisDbService,
    private analysisValidationService: AnalysisValidationService,
    private calendarizationService: CalanderizationService,
    private accountReportDbService: AccountReportDbService,
    private accountAnalysisService: AccountAnalysisService,
    private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private utiltiyMeterGroupDbService: UtilityMeterGroupdbService,
    private predictorDbService: PredictorDbService) { }

  ngOnInit(): void {
    this.analysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    if (!this.analysisItem) {
      this.router.navigateByUrl('/account/analysis/dashboard')
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.setDisableForm();
    this.setShowInUseMessage();
    this.energyUnit = this.account.energyUnit;
    this.yearOptions = this.calendarizationService.getYearOptionsAccount(this.analysisItem.analysisCategory);
    this.setBaselineYearWarning();
  }

  async saveItem() {
    let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    this.analysisItem.setupErrors = this.analysisValidationService.getAccountAnalysisSetupErrors(this.analysisItem, analysisItems);
    await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(this.analysisItem));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountAnalysisItems(account, false);
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.analysisItem);
  }

  async changeReportYear() {
    this.setBaselineYearWarning();
    if (!this.baselineYearWarning) {
      let allAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
      let selectYearAnalysis: boolean = true;
      allAnalysisItems.forEach(item => {
        if (item.reportYear == this.analysisItem.reportYear && item.selectedYearAnalysis) {
          selectYearAnalysis = false;
        }
      });
      this.analysisItem.selectedYearAnalysis = selectYearAnalysis;
    } else {
      this.analysisItem.selectedYearAnalysis = false;
    }
    await this.saveItem();
  }

  setBaselineYearWarning() {
    if (this.analysisItem.analysisCategory == 'water') {
      if (this.analysisItem.baselineYear && this.account.sustainabilityQuestions.waterReductionGoal && this.account.sustainabilityQuestions.waterReductionBaselineYear != this.analysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your corporate baseline year. This analysis cannot be included in reports or figures relating to the corporate water goal."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else if (this.analysisItem.analysisCategory == 'energy') {
      if (this.analysisItem.baselineYear && this.account.sustainabilityQuestions.energyReductionGoal && this.account.sustainabilityQuestions.energyReductionBaselineYear != this.analysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your corporate baseline year. This analysis cannot be included in reports or figures relating to the corporate energy goal."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else {
      this.baselineYearWarning = undefined;
    }
  }

  setDisableForm() {
    let hasItemsSelected: boolean = false;
    this.analysisItem.facilityAnalysisItems.forEach(item => {
      if (item.analysisItemId != undefined) {
        hasItemsSelected = true;
      }
    });
    this.disableForm = hasItemsSelected;
  }

  setShowInUseMessage() {
    let hasCorrespondingReport: boolean = this.accountReportDbService.getHasCorrespondingReport(this.analysisItem.guid);
    if (hasCorrespondingReport && this.accountAnalysisService.hideInUseMessage == false) {
      this.showInUseMessage = true;
    }
  }

  hideInUseMessage() {
    this.showInUseMessage = false;
    this.accountAnalysisService.hideInUseMessage = true;
  }

  showEnableForm() {
    this.displayEnableForm = true;
  }

  cancelEnableForm() {
    this.displayEnableForm = false;
  }

  async confirmEnableForm() {
    this.analysisItem.facilityItemsInitialized = false;
    this.analysisItem.facilityAnalysisItems.forEach(item => {
      item.analysisItemId = undefined;
    });
    await this.saveItem();
    this.disableForm = false;
    this.displayEnableForm = undefined;
  }

  openBulkAnalysisModal() {
    this.displayBulkAnalysisModal = true;
  }

  closeBulkAnalysisModal() {
    this.displayBulkAnalysisModal = false;
  }

  async confirmBulkAnalysisCreate() {
    this.closeBulkAnalysisModal();
    this.loadingService.setLoadingMessage('Creating Analysis Items...');
    this.loadingService.setLoadingStatus(true);
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utiltiyMeterGroupDbService.accountMeterGroups.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    for (let i = 0; i < facilities.length; i++) {
      let facility: IdbFacility = facilities[i];
      this.dbChangesService.selectFacility(facility);
      let newIdbItem: IdbAnalysisItem = getNewIdbAnalysisItem(this.account, facility, accountMeterGroups, accountPredictors, this.analysisItem.analysisCategory);
      newIdbItem.energyIsSource = this.analysisItem.energyIsSource;
      newIdbItem.reportYear = this.analysisItem.reportYear;
      newIdbItem.groups.forEach(group => {
        group.analysisType = this.analysisType;
        group.groupErrors = this.analysisValidationService.getGroupErrors(group, newIdbItem);
      });
      newIdbItem = this.analysisService.setDataAdjustments(newIdbItem);
      newIdbItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(newIdbItem);
      newIdbItem = await firstValueFrom(this.analysisDbService.addWithObservable(newIdbItem));
      for (let f = 0; f < this.analysisItem.facilityAnalysisItems.length; f++) {
        if (this.analysisItem.facilityAnalysisItems[f].facilityId == facility.guid) {
          this.analysisItem.facilityAnalysisItems[f].analysisItemId = newIdbItem.guid;
        }
      }
    }
    await this.dbChangesService.setAnalysisItems(this.account, true);
    await this.saveItem();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Facility Analysis Items Created.', undefined, undefined, false, 'alert-success');
    this.router.navigateByUrl('/account/analysis/select-items');
  }
}
