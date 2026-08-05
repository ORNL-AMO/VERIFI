import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, effect, inject, Signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import { EnergyUnitOptions, UnitOption, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { debounceTime, firstValueFrom } from 'rxjs';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AccountAnalysisService } from '../account-analysis.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisType } from 'src/app/models/analysis';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getYearsWithFullDataAccountAnalysis } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { AccountAnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/accountAnalysisStatusCheck';

@Component({
  selector: 'app-account-analysis-setup',
  templateUrl: './account-analysis-setup.component.html',
  styleUrls: ['./account-analysis-setup.component.css'],
  standalone: false
})
export class AccountAnalysisSetupComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly accountDbService = inject(AccountdbService);
  private readonly accountAnalysisDbService = inject(AccountAnalysisDbService);
  private readonly router = inject(Router);
  private readonly dbChangesService = inject(DbChangesService);
  private readonly analysisDbService = inject(AnalysisDbService);
  private readonly calendarizationService = inject(CalanderizationService);
  private readonly accountReportDbService = inject(AccountReportDbService);
  private readonly accountAnalysisService = inject(AccountAnalysisService);
  private readonly facilityDbService = inject(FacilitydbService);
  private readonly loadingService = inject(LoadingService);
  private readonly toastNotificationService = inject(ToastNotificationsService);
  private readonly utiltiyMeterGroupDbService = inject(UtilityMeterGroupdbService);
  private readonly predictorDbService = inject(PredictorDbService);
  private readonly fb = inject(FormBuilder);
  private readonly accountStatusCheckService = inject(AccountStatusCheckService);

  readonly account: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  readonly analysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountAnalysisDbService.selectedAnalysisItem);
  readonly calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calendarizationService.calanderizedMeters);
  readonly accountReports: Signal<Array<IdbAccountReport>> = toSignal(this.accountReportDbService.accountReports);
  private readonly _accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);
  private readonly _hideInUseMessage: Signal<boolean> = toSignal(this.accountAnalysisService.hideInUseMessage);

  readonly analysisStatusCheck: Signal<AccountAnalysisStatusCheck | undefined> = computed(() => {
    const accountStatusCheck = this._accountStatusCheck();
    const analysisItem = this.analysisItem();
    if (!accountStatusCheck || !analysisItem) { return undefined; }
    return accountStatusCheck.getAccountAnalysisStatusCheckById(analysisItem.guid);
  });

  readonly energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  readonly waterUnitOptions: Array<UnitOption> = VolumeLiquidOptions;
  readonly months: Array<Month> = Months;

  readonly showInUseMessage: Signal<boolean> = computed(() => {
    const analysisItem = this.analysisItem();
    const reports = this.accountReports();
    if (this._hideInUseMessage()) { return false; }
    if (analysisItem && reports) {
      return reports.some(report => {
        if (report.reportType == 'betterPlants' && report.betterPlantsReportSetup.analysisItemId == analysisItem.guid) {
          return true;
        } else if (report.reportType == 'analysis' && report.analysisReportSetup.analysisItemId == analysisItem.guid) {
          return true;
        } else if (report.reportType == 'accountSavings' && report.accountSavingsReportSetup.analysisItemId == analysisItem.guid) {
          return true;
        } else if (report.reportType == 'performance' && report.performanceReportSetup.analysisItemId == analysisItem.guid) {
          return true;
        }
        return false;
      });
    }
    return false;
  });

  readonly baselineYearWarning: Signal<string> = computed(() => {
    const analysisItem = this.analysisItem();
    const account = this.account();
    if (!analysisItem) {
      return undefined;
    }
    if (analysisItem.analysisCategory == 'water') {
      if (analysisItem.baselineYear && account.sustainabilityQuestions.waterReductionGoal && account.sustainabilityQuestions.waterReductionBaselineYear != analysisItem.baselineYear) {
        return 'This baseline year does not match your corporate baseline year. This analysis cannot be included in reports or figures relating to the corporate water goal.';
      }
    } else if (analysisItem.analysisCategory == 'energy') {
      if (analysisItem.baselineYear && account.sustainabilityQuestions.energyReductionGoal && account.sustainabilityQuestions.energyReductionBaselineYear != analysisItem.baselineYear) {
        return 'This baseline year does not match your corporate baseline year. This analysis cannot be included in reports or figures relating to the corporate energy goal.';
      }
    }
    return undefined;
  });

  readonly yearOptions: Signal<Array<number>> = computed(() => {
    const account: IdbAccount = this.account();
    const analysisItem: IdbAccountAnalysisItem = this.analysisItem();
    const calanderizedMeters = this.calanderizedMeters();
    if (account && analysisItem && calanderizedMeters) {
      return getYearsWithFullDataAccountAnalysis(calanderizedMeters, analysisItem, account);
    }
    return [];
  });

  readonly disableForm: Signal<boolean> = computed(() => {
    const analysisItem = this.analysisItem();
    if (!analysisItem) { return false; }
    return analysisItem.facilityAnalysisItems.some(item => item.analysisItemId != undefined);
  });

  displayEnableForm = false;
  displayBulkAnalysisModal = false;

  // Tracks the GUID of the selected analysis item to detect item switches vs. saves of the same item.
  private readonly _currentItemGuid = computed(() => this.analysisItem()?.guid);

  readonly form: FormGroup<{
    name: FormControl<string>;
    energyIsSource: FormControl<boolean>;
    energyUnit: FormControl<string>;
    waterUnit: FormControl<string>;
    baselineYear: FormControl<number | null>;
  }> = this.fb.group({
    name: this.fb.nonNullable.control('', Validators.required),
    energyIsSource: this.fb.nonNullable.control<boolean>(true),
    energyUnit: this.fb.nonNullable.control(''),
    waterUnit: this.fb.nonNullable.control(''),
    baselineYear: this.fb.control<number | null>(null, Validators.required),
  });

  readonly analysisTypeControl = this.fb.nonNullable.control<AnalysisType>('absoluteEnergyConsumption');

  constructor() {
    // Patch form only when switching to a different analysis item (GUID change).
    // Using untracked() to read the item value without creating an additional reactive dependency.
    effect(() => {
      this._currentItemGuid();
      const item = untracked(() => this.analysisItem());
      if (!item) {
        this.router.navigateByUrl('/data-evaluation/account/analysis/dashboard');
        return;
      }
      this.form.patchValue({
        name: item.name,
        energyIsSource: item.energyIsSource,
        energyUnit: item.energyUnit,
        waterUnit: item.waterUnit,
        baselineYear: item.baselineYear ?? null,
      }, { emitEvent: false });
    });

    // Manage control disabled states based on disableForm signal.
    effect(() => {
      const disabled = this.disableForm();
      const { energyIsSource, energyUnit, waterUnit, baselineYear } = this.form.controls;
      if (disabled) {
        energyIsSource.disable({ emitEvent: false });
        energyUnit.disable({ emitEvent: false });
        waterUnit.disable({ emitEvent: false });
        baselineYear.disable({ emitEvent: false });
      } else {
        energyIsSource.enable({ emitEvent: false });
        energyUnit.enable({ emitEvent: false });
        waterUnit.enable({ emitEvent: false });
        baselineYear.enable({ emitEvent: false });
      }
    });

    // Auto-save on any valid form value change.
    this.form.valueChanges.pipe(
      debounceTime(100),
      takeUntilDestroyed()
    ).subscribe(() => {
      if (this.form.valid) {
        this.saveItem();
      }
    });
  }

  async saveItem(): Promise<void> {
    const item = this.analysisItem();
    if (!item) { return; }
    const raw = this.form.getRawValue();
    const updatedItem: IdbAccountAnalysisItem = {
      ...item,
      isAnalysisVisited: false,
      name: raw.name,
      energyIsSource: raw.energyIsSource,
      energyUnit: raw.energyUnit,
      waterUnit: raw.waterUnit,
      baselineYear: raw.baselineYear ?? item.baselineYear,
    };
    await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(updatedItem));
    const account: IdbAccount = this.accountWorkspaceStore.account();
    await this.dbChangesService.setAccountAnalysisItems(account, false);
    this.accountAnalysisDbService.selectedAnalysisItem.next(updatedItem);
  }

  toggleHideInUseMessage(): void {
    this.accountAnalysisService.hideInUseMessage.next(true);
  }

  showEnableForm(): void {
    this.displayEnableForm = true;
  }

  cancelEnableForm(): void {
    this.displayEnableForm = false;
  }

  async confirmEnableForm(): Promise<void> {
    const item = this.analysisItem();
    if (!item) { return; }
    const clearedItem: IdbAccountAnalysisItem = {
      ...item,
      facilityItemsInitialized: false,
      facilityAnalysisItems: item.facilityAnalysisItems.map(fi => ({
        ...fi,
        analysisItemId: undefined,
      })),
    };
    await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(clearedItem));
    const account: IdbAccount = this.accountWorkspaceStore.account();
    await this.dbChangesService.setAccountAnalysisItems(account, false);
    this.accountAnalysisDbService.selectedAnalysisItem.next(clearedItem);
    this.displayEnableForm = false;
  }

  openBulkAnalysisModal(): void {
    this.displayBulkAnalysisModal = true;
  }

  closeBulkAnalysisModal(): void {
    this.displayBulkAnalysisModal = false;
  }

  async confirmBulkAnalysisCreate(): Promise<void> {
    this.closeBulkAnalysisModal();
    this.loadingService.setLoadingMessage('Creating Analysis Items...');
    this.loadingService.setLoadingStatus(true);
    const account = this.account();
    const analysisItem = this.analysisItem();
    const accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utiltiyMeterGroupDbService.accountMeterGroups.getValue();
    const accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    const facilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
    const analysisType = this.analysisTypeControl.value;
    let updatedFacilityAnalysisItems = analysisItem.facilityAnalysisItems.map(fi => ({ ...fi }));
    for (let i = 0; i < facilities.length; i++) {
      const facility: IdbFacility = facilities[i];
      this.dbChangesService.selectFacility(facility);
      let newIdbItem: IdbAnalysisItem = getNewIdbAnalysisItem(account, facility, accountMeterGroups, accountPredictors, analysisItem.analysisCategory);
      newIdbItem.energyIsSource = analysisItem.energyIsSource;
      let facilityBaselineYear: number;
      if (analysisItem.analysisCategory == 'energy') {
        facilityBaselineYear = facility.sustainabilityQuestions.energyReductionBaselineYear;
      } else if (analysisItem.analysisCategory == 'water') {
        facilityBaselineYear = facility.sustainabilityQuestions.waterReductionBaselineYear;
      }
      if (facility.isNewFacility && (facilityBaselineYear > analysisItem.baselineYear)) {
        newIdbItem.baselineYear = facilityBaselineYear;
      } else {
        newIdbItem.baselineYear = analysisItem.baselineYear;
      }
      if (analysisItem.name != '') {
        newIdbItem.name = analysisItem.name;
      }
      newIdbItem.groups.forEach(group => {
        group.analysisType = analysisType;
      });
      newIdbItem = await firstValueFrom(this.analysisDbService.addWithObservable(newIdbItem));
      updatedFacilityAnalysisItems = updatedFacilityAnalysisItems.map(fi =>
        fi.facilityId === facility.guid ? { ...fi, analysisItemId: newIdbItem.guid } : fi
      );
    }
    await this.dbChangesService.setAnalysisItems(account, true);
    const updatedItem: IdbAccountAnalysisItem = {
      ...analysisItem,
      isAnalysisVisited: false,
      facilityAnalysisItems: updatedFacilityAnalysisItems,
    };
    await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(updatedItem));
    await this.dbChangesService.setAccountAnalysisItems(account, false);
    this.accountAnalysisDbService.selectedAnalysisItem.next(updatedItem);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Facility Analysis Items Created.', undefined, undefined, false, 'alert-success');
    this.router.navigateByUrl('/data-evaluation/account/analysis/select-items');
  }

  goToSettings(): void {
    this.router.navigateByUrl('/data-evaluation/account/settings');
  }
}
