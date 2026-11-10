import { AnalysisAutosave } from '../analysis-autosave';
import { FacilityAnalysisFieldChanges } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import * as _ from 'lodash';
import { getFacilityAnalysisFieldChanges } from '../analysis-edits';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { DestroyRef, HostListener, Component, computed, effect, inject, signal, Signal, untracked } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { EnergyUnitOptions, UnitOption } from '@shared/unitOptions';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { ActivatedRoute, Router } from '@angular/router';
import { VolumeLiquidOptions } from '@shared/unitOptions';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { CalanderizedMeter } from '@data/models/calanderization';
import { getYearsWithFullDataAnalysis } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { FacilityStatusCheck } from '@domain/calculations/status-check-calculations/facilityStatusCheck';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';

interface SetupDraft {
  accountGuid: string;
  analysisGuid: string;
  fields: FacilityAnalysisFieldChanges;
  clearModelsVersion: number;
}

@Component({
  selector: 'app-analysis-setup',
  templateUrl: './analysis-setup.component.html',
  styleUrls: ['./analysis-setup.component.css'],
  standalone: false
})
export class AnalysisSetupComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routerGuardService = inject(RouterGuardService);
  private readonly fb = inject(FormBuilder);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly analysisService = inject(AnalysisService);
  private readonly router = inject(Router);
  private readonly calanderizationService = inject(CalanderizationService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly accountStatusCheckService = inject(AccountStatusCheckService);

  readonly energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  readonly waterUnitOptions: Array<UnitOption> = VolumeLiquidOptions;

  readonly calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters);
  readonly facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  readonly analysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;
  readonly account: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  readonly hideInUseMessage: Signal<boolean> = toSignal(this.analysisService.hideInUseMessage);
  readonly allFacilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = computed(() => [...[...this.accountWorkspaceStore.selectedFacilityAnalyses()]]);
  readonly facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);


  readonly analysisStatusCheck = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    const analysisItem = this.analysisItem();
    if (!facilityStatusCheck || !analysisItem) { return undefined; }
    return facilityStatusCheck.getAnalysisStatusById(analysisItem.guid);
  });

  /** True when any analysis group has setup configuration errors. */
  readonly hasGroupSetupErrors = computed(() => {
    const analysisStatusCheck = this.analysisStatusCheck();
    return analysisStatusCheck?.groupStatusChecks.some(g => g.groupAnalysisErrors?.hasErrors) ?? false;
  });

  /** True when any analysis group has regression model errors. */
  readonly hasGroupModelWarnings = computed(() => {
    const analysisStatusCheck = this.analysisStatusCheck();
    return analysisStatusCheck?.groupStatusChecks.some(g => g.groupAnalysisErrors?.hasRegressionErrors) ?? false;
  });

  yearOptions: Signal<Array<number>> = computed(() => {
    const analysisItem: IdbAnalysisItem = this.analysisItem();
    const calanderizedMeters: Array<CalanderizedMeter> = this.calanderizedMeters();
    const facility: IdbFacility = this.facility();
    if (!analysisItem || !calanderizedMeters || !facility) {
      return [];
    }
    return getYearsWithFullDataAnalysis(calanderizedMeters, analysisItem, facility);
  });

  baselineYearWarning: Signal<string> = computed(() => {
    const analysisItem: IdbAnalysisItem = this.analysisItem();
    const facility: IdbFacility = this.facility();
    if (!analysisItem || !facility) {
      return undefined;
    }
    if (analysisItem.analysisCategory == 'water') {
      if (analysisItem.baselineYear && facility.sustainabilityQuestions.waterReductionGoal && facility.sustainabilityQuestions.waterReductionBaselineYear != analysisItem.baselineYear) {
        return "This baseline year does not match your facility baseline year. This analysis cannot be included in reports or figures relating to the facility water goal."
      } else {
        return undefined;
      }
    } else if (analysisItem.analysisCategory == 'energy') {
      if (analysisItem.baselineYear && facility.sustainabilityQuestions.energyReductionGoal && facility.sustainabilityQuestions.energyReductionBaselineYear != analysisItem.baselineYear) {
        return "This baseline year does not match your facility baseline year. This analysis cannot be included in reports or figures relating to the facility energy goal.";
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  });

  showInUseMessage: Signal<boolean> = computed(() => {
    const analysisItem = this.analysisItem();
    if (analysisItem && this.hideInUseMessage() == false) {
      const accountAnalysisItems = this.accountWorkspaceQuery.getAccountAnalysesForFacilityAnalysis(analysisItem.guid);
      if (accountAnalysisItems.length != 0) {
        return true;
      }
    }
    return false;
  });

  hasModelsGenerated: Signal<boolean> = computed(() => {
    const analysisItem = this.analysisItem();
    if (!analysisItem) {
      return false;
    }
    let hasModelsGenerated: boolean = false;
    analysisItem.groups.forEach(group => {
      if (group.analysisType == 'regression') {
        if (group.models && group.models.length != 0) {
          hasModelsGenerated = true;
        }
      }
    });
    return hasModelsGenerated;
  });

  private readonly draftEnergyIsSource = signal<boolean | undefined>(undefined);
  readonly facilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = computed(() =>
    this.getBankingCandidates(this.draftEnergyIsSource() ?? this.analysisItem()?.energyIsSource));

  readonly form: FormGroup<{
    name: FormControl<string>;
    energyIsSource: FormControl<boolean>;
    energyUnit: FormControl<string>;
    waterUnit: FormControl<string>;
    hasBanking: FormControl<boolean>;
    baselineYear: FormControl<number | null>;
    bankedAnalysisItemId: FormControl<string | null>;
  }> = this.fb.group({
    name: this.fb.nonNullable.control('', Validators.required),
    energyIsSource: this.fb.nonNullable.control<boolean>(true),
    energyUnit: this.fb.nonNullable.control(''),
    waterUnit: this.fb.nonNullable.control(''),
    hasBanking: this.fb.nonNullable.control(false),
    baselineYear: this.fb.control<number | null>(null, Validators.required),
    bankedAnalysisItemId: this.fb.control<string | null>(null),
  });

  readonly autosave = new AnalysisAutosave<SetupDraft>((draft, baseline) => this.persistDraft(draft, baseline));
  private ownerKey: string;
  private clearModelsVersion = 0;
  private observedDraft: SetupDraft;

  displayEnableForm = false;

  constructor() {
    effect(() => {
      const item = this.analysisItem();
      const accountGuid = this.account()?.guid;
      if (!item) { return; }
      untracked(() => {
        const ownerKey = accountGuid + ':' + item.guid;
        if (this.ownerKey !== ownerKey || !this.autosave.hasPending) {
          if (this.ownerKey !== ownerKey) { this.clearModelsVersion = 0; }
          this.ownerKey = ownerKey;
          this.form.patchValue({
            name: item.name, energyIsSource: item.energyIsSource, energyUnit: item.energyUnit,
            waterUnit: item.waterUnit, hasBanking: item.hasBanking, baselineYear: item.baselineYear ?? null,
            bankedAnalysisItemId: item.bankedAnalysisItemId ?? null
          }, { emitEvent: false });
          this.draftEnergyIsSource.set(item.energyIsSource);
          this.updateBankingValidation();
          this.form.markAsPristine();
          this.observedDraft = this.readDraft();
          this.autosave.hydrate(this.observedDraft, this.form.valid);
        }
      });
    });
    this.destroyRef.onDestroy(() => this.autosave.destroy());

    // Manage individual control disabled states based on model lock and in-use status.
    effect(() => {
      const locked = this.hasModelsGenerated();
      const inUse = this.showInUseMessage();
      const { energyIsSource, energyUnit, waterUnit, hasBanking, baselineYear } = this.form.controls;

      // Locked when models exist OR analysis is in use by an account analysis
      if (locked || inUse) {
        energyIsSource.disable({ emitEvent: false });
        baselineYear.disable({ emitEvent: false });
      } else {
        energyIsSource.enable({ emitEvent: false });
        baselineYear.enable({ emitEvent: false });
      }

      // Locked only when models exist
      if (locked) {
        energyUnit.disable({ emitEvent: false });
        waterUnit.disable({ emitEvent: false });
        hasBanking.disable({ emitEvent: false });
      } else {
        energyUnit.enable({ emitEvent: false });
        waterUnit.enable({ emitEvent: false });
        hasBanking.enable({ emitEvent: false });
      }
    });

    // Clear bankedAnalysisItemId when hasBanking is toggled off.
    this.form.controls.hasBanking.valueChanges.pipe(
      takeUntilDestroyed()
    ).subscribe(hasBanking => {
      if (!hasBanking) {
        this.form.controls.bankedAnalysisItemId.setValue(null, { emitEvent: false });
      }
      this.updateBankingValidation();
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const boundary = this.form.controls.energyIsSource.value;
      if (this.observedDraft && this.observedDraft.fields.energyIsSource !== boundary
        && this.form.controls.hasBanking.value) {
        const candidates = this.getBankingCandidates(boundary);
        if (!candidates.some(item => item.guid === this.form.controls.bankedAnalysisItemId.value)) {
          // Reconcile this explicit edit before capturing the complete settings draft.
          this.form.patchValue({ hasBanking: candidates.length > 0, bankedAnalysisItemId: null }, { emitEvent: false });
          this.updateBankingValidation();
        }
      }
      this.draftEnergyIsSource.set(boundary);
      const draft = this.readDraft();
      const immediate = this.observedDraft && Object.keys(draft.fields)
        .some(field => field !== 'name' && !_.isEqual(this.observedDraft.fields[field], draft.fields[field]));
      this.observedDraft = draft;
      void this.autosave.capture(draft, this.form.valid, immediate);
    });
  }

  private getBankingCandidates(energyIsSource: boolean): Array<IdbAnalysisItem> {
    const analysisItem = this.analysisItem();
    return analysisItem ? this.allFacilityAnalysisItems().filter(item =>
      item.energyIsSource === energyIsSource && item.guid !== analysisItem.guid
      && item.analysisCategory === analysisItem.analysisCategory) : [];
  }

  private updateBankingValidation(): void {
    const control = this.form.controls.bankedAnalysisItemId;
    control.setValidators(this.form.controls.hasBanking.value ? Validators.required : null);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private readDraft(): SetupDraft {
    const raw = this.form.getRawValue();
    return {
      accountGuid: this.account()?.guid, analysisGuid: this.analysisItem()?.guid, clearModelsVersion: this.clearModelsVersion,
      fields: {
        name: raw.name, energyIsSource: raw.energyIsSource, energyUnit: raw.energyUnit, waterUnit: raw.waterUnit,
        hasBanking: raw.hasBanking, baselineYear: raw.baselineYear,
        bankedAnalysisItemId: raw.hasBanking ? raw.bankedAnalysisItemId ?? undefined : undefined
      }
    };
  }

  private restoreDraft(draft: SetupDraft): void {
    this.clearModelsVersion = draft.clearModelsVersion;
    this.form.patchValue({ ...draft.fields, bankedAnalysisItemId: draft.fields.bankedAnalysisItemId ?? null }, { emitEvent: false });
    this.draftEnergyIsSource.set(this.form.controls.energyIsSource.value);
    this.updateBankingValidation();
    this.form.markAsPristine();
    this.observedDraft = draft;
  }

  private async persistDraft(draft: SetupDraft, baseline: SetupDraft): Promise<void> {
    const changes = getFacilityAnalysisFieldChanges(baseline.fields as IdbAnalysisItem, draft.fields);
    const clearModels = draft.clearModelsVersion !== baseline.clearModelsVersion;
    if (!Object.keys(changes).length && !clearModels) { return; }
    await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'update', entityGuid: draft.analysisGuid, label: clearModels ? 'Clear Facility Analysis Models' : 'Save Facility Analysis',
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityAnalyses', upsert: [value] }] }) } },
      () => clearModels
        ? this.analysisHandler.clearFacilityAnalysisModels(draft.analysisGuid, draft.accountGuid, changes)
        : this.analysisHandler.updateFacilityAnalysisFields(draft.analysisGuid, changes, draft.accountGuid)
    );
  }

  saveItem(): Promise<boolean> {
    return this.autosave.capture(this.readDraft(), this.form.valid, true);
  }

  flushChanges(): Promise<boolean> { return this.autosave.flush(); }

  canDeactivate(): Promise<boolean> {
    return this.autosave.canDeactivate(this.routerGuardService, draft => this.restoreDraft(draft));
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.autosave.hasPending) { event.preventDefault(); event.returnValue = ''; }
  }

  toggleHideInUseMessage(): void {
    this.analysisService.hideInUseMessage.next(true);
  }

  showEnableForm(): void {
    this.displayEnableForm = true;
  }

  cancelEnableForm(): void {
    this.displayEnableForm = false;
  }

  async confirmEnableForm(): Promise<void> {
    if (!await this.flushChanges()) { this.form.markAllAsTouched(); return; }
    const item = this.analysisItem();
    if (!item) { return; }
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    this.clearModelsVersion++;
    const saved = await this.autosave.capture(this.readDraft(), true, true);
    if (!saved) { return; }
    if (!this.destroyRef.destroyed && this.analysisItem()?.guid === item.guid
      && this.accountWorkspaceStore.account()?.guid === activeAccountGuid) {
      this.displayEnableForm = false;
    }
  }

  goToSavingsReport(): void {
    this.router.navigate(['../../../reports'], { relativeTo: this.activatedRoute });
  }

  goToSettings(): void {
    this.router.navigateByUrl('/data-evaluation/account/settings');
  }

  setBankedAnalysisItemId(bankedAnalysisItemId: string): void {
    this.form.controls.bankedAnalysisItemId.setValue(bankedAnalysisItemId);
  }
}
