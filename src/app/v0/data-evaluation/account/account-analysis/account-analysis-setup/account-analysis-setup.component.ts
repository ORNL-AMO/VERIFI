import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, computed, DestroyRef, effect, HostListener, inject, signal, Signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { AccountAnalysisFieldChanges, AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { Month, Months } from '@shared/form-data/months';
import { EnergyUnitOptions, UnitOption, VolumeLiquidOptions } from '@shared/unitOptions';
import { firstValueFrom, take } from 'rxjs';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { AccountAnalysisService } from '@v0/data-evaluation/account/account-analysis/account-analysis.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisType } from '@data/models/analysis';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CalanderizedMeter } from '@data/models/calanderization';
import { getYearsWithFullDataAccountAnalysis } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from '@domain/calculations/status-check-calculations/accountStatusCheck';
import { AccountAnalysisStatusCheck } from '@domain/calculations/status-check-calculations/accountAnalysisStatusCheck';

interface SetupDraft {
  accountGuid: string;
  analysisGuid: string;
  changes: AccountAnalysisFieldChanges;
  version: number;
  key: string;
  valid: boolean;
}

@Component({
  selector: 'app-account-analysis-setup',
  templateUrl: './account-analysis-setup.component.html',
  styleUrls: ['./account-analysis-setup.component.css'],
  standalone: false
})
export class AccountAnalysisSetupComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routerGuardService = inject(RouterGuardService);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly calendarizationService = inject(CalanderizationService);
  private readonly accountAnalysisService = inject(AccountAnalysisService);
  private readonly loadingService = inject(LoadingService);
  private readonly toastNotificationService = inject(ToastNotificationsService);
  private readonly fb = inject(FormBuilder);
  private readonly accountStatusCheckService = inject(AccountStatusCheckService);

  readonly account: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  readonly analysisItem: Signal<IdbAccountAnalysisItem> = this.accountWorkspaceStore.selectedAccountAnalysis;
  readonly calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calendarizationService.calanderizedMeters);
  readonly accountReports: Signal<Array<IdbAccountReport>> = computed(() => [...this.accountWorkspaceStore.accountReports()]);
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

  readonly saving = signal(false);
  readonly saveError = signal<string | undefined>(undefined);
  private formOwner?: { accountGuid: string; analysisGuid: string };
  private savedKey = '';
  private editVersion = 0;
  private pendingDraft?: SetupDraft;
  private saveTimer?: ReturnType<typeof setTimeout>;
  private saveRequested = false;
  private runningSave?: Promise<void>;
  private leaveDecision?: Promise<boolean>;
  private lastSaveFailure?: unknown;
  private destroyed = false;

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
      this.clearSaveTimer();
      this.pendingDraft = undefined;
      this.saveRequested = false;
      this.formOwner = { accountGuid: item.accountId, analysisGuid: item.guid };
      this.saveError.set(undefined);
      this.lastSaveFailure = undefined;
      this.form.patchValue({
        name: item.name,
        energyIsSource: item.energyIsSource,
        energyUnit: item.energyUnit,
        waterUnit: item.waterUnit,
        baselineYear: item.baselineYear ?? null,
      }, { emitEvent: false });
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.savedKey = JSON.stringify(this.form.getRawValue());
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

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.captureDraft();
      this.clearSaveTimer();
      if (this.pendingDraft?.valid) {
        this.saveTimer = setTimeout(() => {
          this.saveTimer = undefined;
          this.saveRequested = true;
          void this.drainSaves();
        }, 300);
      }
    });
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.clearSaveTimer();
    });
  }

  async saveItem(): Promise<void> {
    this.captureDraft();
    if (!await this.flushChanges() && this.lastSaveFailure) {
      throw this.lastSaveFailure;
    }
  }

  async flushChanges(): Promise<boolean> {
    const context = this.editingContext();
    if (!this.isCurrentContext(context)) return false;
    this.clearSaveTimer();
    while (this.pendingDraft || this.runningSave) {
      if (!this.isCurrentContext(context)) return false;
      if (this.runningSave) {
        await this.runningSave;
        if (!this.isCurrentContext(context) || this.lastSaveFailure) return false;
      }
      if (this.pendingDraft && !this.pendingDraft.valid) {
        this.form.markAllAsTouched();
        return false;
      }
      this.saveRequested = true;
      await this.drainSaves();
      this.clearSaveTimer();
      if (!this.isCurrentContext(context) || this.lastSaveFailure) return false;
    }
    return this.isCurrentContext(context);
  }

  retrySave(): void {
    void this.flushChanges();
  }

  canDeactivate(): Promise<boolean> {
    if (!this.leaveDecision) {
      this.leaveDecision = this.finishEditing().finally(() => this.leaveDecision = undefined);
    }
    return this.leaveDecision;
  }

  @HostListener('window:beforeunload', ['$event'])
  warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.pendingDraft || this.runningSave) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  private captureDraft(): void {
    if (this.destroyed || !this.formOwner) return;
    const values = this.form.getRawValue();
    const key = JSON.stringify(values);
    if (!this.runningSave && key === this.savedKey) {
      this.pendingDraft = undefined;
      this.saveError.set(undefined);
      this.lastSaveFailure = undefined;
      return;
    }
    this.pendingDraft = {
      ...this.formOwner,
      changes: { ...values, isAnalysisVisited: false },
      version: ++this.editVersion,
      key,
      valid: this.form.valid
    };
    this.saveError.set(undefined);
    this.lastSaveFailure = undefined;
  }

  private drainSaves(): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    if (this.runningSave) return this.runningSave;
    this.runningSave = this.persistRequestedDrafts().finally(() => {
      this.runningSave = undefined;
      if (!this.destroyed) this.saving.set(false);
    });
    return this.runningSave;
  }

  private async persistRequestedDrafts(): Promise<void> {
    while (!this.destroyed && this.saveRequested && this.pendingDraft) {
      const draft = this.pendingDraft;
      const owner = this.formOwner;
      this.saveRequested = false;
      if (!draft.valid) return;
      this.saving.set(true);
      this.lastSaveFailure = undefined;
      this.saveError.set(undefined);
      try {
        await this.commandBoundary.execute(
          { entityKind: 'accountAnalysis', changeKind: 'update', entityGuid: draft.analysisGuid, label: 'Save Account Analysis',
            publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'accountAnalyses', upsert: [value] }] }) } },
          () => this.analysisHandler.updateAccountAnalysisFields(draft.analysisGuid, draft.changes, draft.accountGuid)
        );
      } catch (error) {
        if (this.destroyed || this.formOwner !== owner || this.account()?.guid !== draft.accountGuid || this.analysisItem()?.guid !== draft.analysisGuid) {
          if (this.pendingDraft?.version === draft.version) this.pendingDraft = undefined;
          continue;
        }
        this.lastSaveFailure = error;
        this.saveError.set('Your changes could not be saved. Retry, or keep this page open.');
        return;
      }
      if (this.destroyed) return;
      if (this.formOwner?.analysisGuid === draft.analysisGuid && this.formOwner.accountGuid === draft.accountGuid) {
        this.savedKey = draft.key;
      }
      if (this.pendingDraft?.version === draft.version) this.pendingDraft = undefined;
    }
  }

  private editingContext() {
    return { owner: this.formOwner, accountGuid: this.account()?.guid, analysisGuid: this.analysisItem()?.guid };
  }

  private isCurrentContext(context: ReturnType<AccountAnalysisSetupComponent['editingContext']>): boolean {
    return !this.destroyed && this.formOwner === context.owner && this.account()?.guid === context.accountGuid &&
      this.analysisItem()?.guid === context.analysisGuid;
  }

  private async finishEditing(): Promise<boolean> {
    const context = this.editingContext();
    if (!this.lastSaveFailure && await this.flushChanges()) return this.isCurrentContext(context);
    if (!this.isCurrentContext(context)) return false;
    const version = this.editVersion;
    const actionPromise = firstValueFrom(this.routerGuardService.getModalAction().pipe(take(1)));
    this.routerGuardService.setShowSave(this.form.valid);
    this.routerGuardService.setShowModal(true);
    const action = await actionPromise;
    if (!this.isCurrentContext(context) || this.editVersion !== version) return false;
    if (action === 'discard') {
      this.clearSaveTimer();
      this.pendingDraft = undefined;
      this.saveRequested = false;
      this.lastSaveFailure = undefined;
      this.saveError.set(undefined);
      this.form.patchValue(JSON.parse(this.savedKey), { emitEvent: false });
      this.form.markAsPristine();
      this.form.markAsUntouched();
      return true;
    }
    if (action === 'save') return await this.flushChanges() && this.isCurrentContext(context);
    return false;
  }

  private clearSaveTimer(): void {
    if (this.saveTimer !== undefined) clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
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
    const ownerGuid = this.analysisItem()?.guid;
    const accountGuid = this.account()?.guid;
    if (!await this.canDeactivate() || this.destroyed) return;
    if (!this.analysisItem()) throw new WorkspaceWriteError('validation-failed', 'The account analysis is no longer available.');
    if (this.analysisItem().guid !== ownerGuid || this.account()?.guid !== accountGuid) return;
    const item = this.analysisItem();
    if (!item) { return; }
    const analysisGuid = item.guid;
    const assignments = item.facilityAnalysisItems.map(fi => ({
      facilityId: fi.facilityId,
      analysisItemId: undefined,
    }));
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'accountAnalysis', changeKind: 'update', entityGuid: analysisGuid, label: 'Save Account Analysis' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'accountAnalyses', upsert: [value] }] }) }},
      () => this.analysisHandler.updateAccountFacilityAssignments(
        analysisGuid,
        assignments,
        activeAccountGuid,
        { facilityItemsInitialized: false }
      )
    );
    if (!this.destroyed && this.account()?.guid === activeAccountGuid && this.analysisItem()?.guid === analysisGuid) {
      this.displayEnableForm = false;
    }
  }

  openBulkAnalysisModal(): void {
    this.displayBulkAnalysisModal = true;
  }

  closeBulkAnalysisModal(): void {
    this.displayBulkAnalysisModal = false;
  }

  async confirmBulkAnalysisCreate(): Promise<void> {
    const ownerGuid = this.analysisItem()?.guid;
    const accountGuid = this.account()?.guid;
    const requestedFacilityGuids = this.accountWorkspaceStore.facilities().map(facility => facility.guid);
    if (!await this.canDeactivate() || this.destroyed) return;
    if (!this.analysisItem()) throw new WorkspaceWriteError('validation-failed', 'The account analysis is no longer available.');
    if (this.analysisItem().guid !== ownerGuid || this.account()?.guid !== accountGuid) return;
    if (requestedFacilityGuids.some(guid => !this.accountWorkspaceStore.facilities().some(facility => facility.guid === guid))) {
      throw new WorkspaceWriteError('validation-failed', 'A facility is no longer available.');
    }
    this.closeBulkAnalysisModal();
    this.loadingService.setLoadingMessage('Creating Analysis Items...');
    this.loadingService.setLoadingStatus(true);
    const account = this.account();
    const analysisItem = this.analysisItem();
    const analysisGuid = analysisItem.guid;
    const accountMeterGroups: Array<IdbUtilityMeterGroup> = [...this.accountWorkspaceStore.meterGroups()];
    const accountPredictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.predictors()];
    const facilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
    const analysisType = this.analysisTypeControl.value;
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'accountAnalysis', changeKind: 'bulk', label: 'Create Bulk Facility Analyses' },
      async () => {
        const currentAnalysis = this.accountWorkspaceStore.accountAnalyses().find(item =>
          item.guid === analysisGuid && item.accountId === activeAccountGuid
        );
        const currentFacilities = this.accountWorkspaceStore.facilities();
        if (!currentAnalysis || facilities.some(facility =>
          !currentFacilities.some(item => item.guid === facility.guid && item.accountId === activeAccountGuid) ||
          !currentAnalysis.facilityAnalysisItems.some(item => item.facilityId === facility.guid))) {
          throw new WorkspaceWriteError('validation-failed', 'The account analysis or facility is no longer available.');
        }
        const assignments: Array<{ facilityId: string; analysisItemId: string }> = [];
        for (let i = 0; i < facilities.length; i++) {
          const facility: IdbFacility = facilities[i];
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
          newIdbItem = await this.analysisHandler.addFacilityAnalysis(newIdbItem, activeAccountGuid);
          assignments.push({ facilityId: facility.guid, analysisItemId: newIdbItem.guid });
        }
        return this.analysisHandler.updateAccountFacilityAssignments(analysisGuid, assignments, activeAccountGuid);
      }
    );
    this.loadingService.setLoadingStatus(false);
    if (this.destroyed || this.account()?.guid !== activeAccountGuid || this.analysisItem()?.guid !== analysisGuid) return;
    this.toastNotificationService.showToast('Facility Analysis Items Created.', undefined, undefined, false, 'alert-success');
    this.router.navigateByUrl('/data-evaluation/account/analysis/select-items');
  }

  goToSettings(): void {
    this.router.navigateByUrl('/data-evaluation/account/settings');
  }
}
